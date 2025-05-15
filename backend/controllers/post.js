import { getDatabase } from './configdb.js';
import { ObjectId } from 'mongodb';
import { Post } from '../models/Post.js';
import fs from 'fs';
import path from 'path';

const POSTS_COLLECTION = 'posts';
const USER_POST_LIKES_COLLECTION = 'userpostlikes';


const imagesBaseDir = path.join(process.cwd(), 'images');


const findPosts = async (query = {}, options = {}) => {
  try {
    const db = getDatabase();
    const postsCollection = db.collection(POSTS_COLLECTION);

    let cursor = postsCollection.find(query);

    if (options.sort) {
      cursor = cursor.sort(options.sort);
    }
    if (options.skip) {
      cursor = cursor.skip(options.skip);
    }
    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }
       if (options.projection) {
        cursor = cursor.project(options.projection);
      }

    const posts = await cursor.toArray();

    return posts;

  } catch (error) {
    console.error('Error in findPosts (DB logic):', error);
    throw error;
  }
};

const createPostDB = async (postDocument) => {
    try {
        const db = getDatabase();
        const postsCollection = db.collection(POSTS_COLLECTION);

        const result = await postsCollection.insertOne(postDocument);

        if (result.acknowledged) {
            return { insertedId: result.insertedId, acknowledged: true };
        } else {
            console.error('Database insertion not acknowledged for new post:', postDocument);
            throw new Error('Post insertion not acknowledged by database.');
        }

    } catch (error) {
        console.error('Error in createPostDB:', error);
        throw error;
    }
};

const findPostByIdDB = async (postId) => {
    try {
        const db = getDatabase();
        const postsCollection = db.collection(POSTS_COLLECTION);
        const objectId = new ObjectId(postId);
        const post = await postsCollection.findOne({ _id: objectId });
        return post;
    } catch (error) {
        console.error('Error in findPostByIdDB:', error);
        if (error.message.includes('ObjectId')) {
            return null;
        }
        throw error;
    }
};

const updatePostDB = async (postId, updateOperators) => {
    try {
        const db = getDatabase();
        const postsCollection = db.collection(POSTS_COLLECTION);

        const objectId = new ObjectId(postId);

        const result = await postsCollection.updateOne(
            { _id: objectId },
            updateOperators
        );

        return result.modifiedCount;

    } catch (error) {
        console.error('Error in updatePostDB:', error);
        throw error;
    }
};

const deletePostDB = async (postId) => {
    try {
        const db = getDatabase();
        const postsCollection = db.collection(POSTS_COLLECTION);
        const objectId = new ObjectId(postId);
        const result = await postsCollection.deleteOne({ _id: objectId });
        return result.deletedCount;
    } catch (error) {
        console.error('Error in deletePostDB:', error);
        throw error;
    }
};


const handlePostLikeDB = async (userId, postId, isLiking = true) => {
    try {
        const db = getDatabase();
        const postsCollection = db.collection(POSTS_COLLECTION);
        const userPostLikesCollection = db.collection(USER_POST_LIKES_COLLECTION);

        const userObjectId = new ObjectId(userId);
        const postObjectId = new ObjectId(postId);

        let updateResult;
        let likeCountIncrement = 0;

        if (isLiking) {
            updateResult = await userPostLikesCollection.updateOne(
                { userId: userObjectId },
                { $addToSet: { likedPostIds: postObjectId } },
                { upsert: true }
            );

            if (updateResult.modifiedCount === 1 || updateResult.upsertedId) {
                likeCountIncrement = 1;
            }

        } else {
             updateResult = await userPostLikesCollection.updateOne(
                { userId: userObjectId },
                { $pull: { likedPostIds: postObjectId } }
            );

            if (updateResult.modifiedCount === 1) {
                likeCountIncrement = -1;
            }
        }

        if (likeCountIncrement !== 0) {
            await postsCollection.updateOne(
                { _id: postObjectId },
                { $inc: { likes: likeCountIncrement } }
            );
        }

        return { likedStateChanged: likeCountIncrement !== 0 };

    } catch (error) {
        console.error('Error in handlePostLikeDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user or post ID format.');
         }
        throw error;
    }
};

const findUserLikedPostIdsDB = async (userId) => {
    try {
        const db = getDatabase();
        const userPostLikesCollection = db.collection(USER_POST_LIKES_COLLECTION);

        const userObjectId = new ObjectId(userId);

        const userLikesDocument = await userPostLikesCollection.findOne(
            { userId: userObjectId },
            { projection: { likedPostIds: 1 } }
        );

        return userLikesDocument && Array.isArray(userLikesDocument.likedPostIds)
               ? userLikesDocument.likedPostIds
               : [];

    } catch (error) {
        console.error('Error in findUserLikedPostIdsDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};


export const createPost = async (req, res) => {
    try {
        const creatorId = req.user.userId;

        const {
            title,
            routeId,
        } = req.body;

        const photoFile = req.file;

        if (!title || !photoFile) {
            return res.status(400).json({ message: 'Missing required post fields (title, photo file).' });
        }

        const photoPath = photoFile.path || photoFile.location;

        let routeObjectId = null;
        if (routeId) {
            if (!ObjectId.isValid(routeId)) {
                return res.status(400).json({ message: 'Invalid route ID format provided.' });
            }
            routeObjectId = new ObjectId(routeId);
        }

        const newPostData = {
            title,
            photo: photoPath,
            creatorId: new ObjectId(creatorId),
            routeId: routeObjectId,
        };

        const insertionResult = await createPostDB(newPostData);

        if (insertionResult && insertionResult.acknowledged) {
            res.status(201).json({
                message: 'Post created successfully.',
                postId: insertionResult.insertedId,
            });
        } else {
             console.error('Post creation failed: DB did not acknowledge insertion.');
             res.status(500).json({ message: 'Post creation failed due to database issue.' });
        }

    } catch (error) {
        console.error('Error in createPost controller:', error);
        res.status(500).json({ message: 'Internal server error during post creation.' });
    }
};


export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'date';

    const skip = (page - 1) * limit;

    let sortOptions = {};
    if (sort === 'likes') {
      sortOptions = { likes: -1, date: -1 };
    } else {
      sortOptions = { date: -1, _id: -1 };
    }

    const projectionOptions = {
      _id: 1,
      title: 1,
      photo: 1,
      date: 1,
      likes: 1,
      creatorId: 1,
      routeId: 1
    };

    const posts = await findPosts(
      {},
      {
        sort: sortOptions,
        skip: skip,
        limit: limit,
        projection: projectionOptions,
      }
    );

    res.status(200).json(posts);

  } catch (error) {
    console.error('Error in getPosts controller:', error);
    res.status(500).json({ message: 'Internal server error fetching posts.' });
  }
};

export const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid post ID format.' });
        }

        const post = await findPostByIdDB(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        res.status(200).json(post);

    } catch (error) {
        console.error('Error in getPostById controller:', error);
        res.status(500).json({ message: 'Internal server error fetching post.' });
    }
};


export const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid post ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        const postToUpdate = await findPostByIdDB(postId);

        if (!postToUpdate) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        if (postToUpdate.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can edit this post.' });
        }

        const creationTime = postToUpdate.date.getTime();
        const currentTime = new Date().getTime();
        const editWindowMilliseconds = 60 * 60 * 1000;

        if (currentTime - creationTime > editWindowMilliseconds) {
            return res.status(403).json({ message: 'Forbidden: Edit window (1 hour) has expired.' });
        }

        const updateOperators = {};
        const setOperator = {};
        const unsetOperator = {};

        const { title } = req.body;
        if (title !== undefined) {
            setOperator.title = title;
        }

        const newPhotoFile = req.file;
        const deleteExistingPhoto = req.body.deleteExistingPhoto === 'true';

        if (newPhotoFile) {
            setOperator.photo = newPhotoFile.path || newPhotoFile.location;
             if (postToUpdate.photo) {
                 fs.promises.unlink(postToUpdate.photo).catch(err => {
                     console.error('Error deleting old post photo:', postToUpdate.photo, err);
                 });
            }
        } else if (deleteExistingPhoto && postToUpdate.photo) {
            unsetOperator.photo = "";
             fs.promises.unlink(postToUpdate.photo).catch(err => {
                 console.error('Error deleting post photo marked for deletion:', postToUpdate.photo, err);
             });
        }

        if (Object.keys(setOperator).length > 0) {
            updateOperators.$set = setOperator;
        }
        if (Object.keys(unsetOperator).length > 0) {
            updateOperators.$unset = unsetOperator;
        }

        if (Object.keys(updateOperators).length === 0) {
             if (newPhotoFile) {
                 fs.promises.unlink(newPhotoFile.path || newPhotoFile.location).catch(err => {
                      console.error('Error deleting unused uploaded new photo:', newPhotoFile.path, err);
                 });
             }
             return res.status(200).json({ message: 'No updatable fields or new photo provided.' });
        }

        const modifiedCount = await updatePostDB(postId, updateOperators);

        if (modifiedCount === 1) {
            res.status(200).json({ message: 'Post updated successfully.' });
        } else {
             console.error('Post update in DB resulted in unexpected modifiedCount:', modifiedCount, 'for post ID:', postId);
             res.status(200).json({ message: 'Post found, but no changes were made or update failed.' });
        }

    } catch (error) {
        console.error('Error in updatePost controller:', error);
        res.status(500).json({ message: 'Internal server error during post update.' });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid post ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        const postToDelete = await findPostByIdDB(postId);

        if (!postToDelete) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        if (postToDelete.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can delete this post.' });
        }

        if (postToDelete.photo) {
             fs.promises.unlink(postToDelete.photo).catch(err => {
                 console.error('Error deleting post photo during delete:', postToDelete.photo, err);
             });
        }

        const deletedCount = await deletePostDB(postId);

        if (deletedCount === 1) {
            res.status(200).json({ message: 'Post deleted successfully.' });
        } else {
             console.error('Post delete in DB failed, document not found after initial find:', postId);
             res.status(500).json({ message: 'Post deletion failed in database.' });
        }

    } catch (error) {
        console.error('Error in deletePost controller:', error);
        res.status(500).json({ message: 'Internal server error during post deletion.' });
    }
};


export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;

         if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid post ID format.' });
        }

        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await handlePostLikeDB(userId, postId, true);

        if (result && result.likedStateChanged) {
             res.status(200).json({ message: 'Post liked successfully.' });
        } else {
             res.status(200).json({ message: 'Post already liked by this user.' });
        }

    } catch (error) {
        console.error('Error in likePost controller:', error);
         if (error.message.includes('Invalid user or post ID format.')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during like operation.' });
    }
};


export const unlikePost = async (req, res) => {
    try {
        const postId = req.params.id;

         if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid post ID format.' });
        }

        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await handlePostLikeDB(userId, postId, false);

        if (result && result.likedStateChanged) {
             res.status(200).json({ message: 'Post unliked successfully.' });
        } else {
             res.status(200).json({ message: 'Post was not liked by this user.' });
        }

    } catch (error) {
        console.error('Error in unlikePost controller:', error);
         if (error.message.includes('Invalid user or post ID format.')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during unlike operation.' });
    }
};


export const getLikedPosts = async (req, res) => {
    try {
        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const likedPostIds = await findUserLikedPostIdsDB(userId);

        if (!likedPostIds || likedPostIds.length === 0) {
            return res.status(200).json([]);
        }

        const projectionOptions = {
          _id: 1,
          title: 1,
          photo: 1,
          date: 1,
          likes: 1,
          creatorId: 1,
          routeId: 1
        };

        const likedPosts = await findPosts(
            { _id: { $in: likedPostIds } },
            { projection: projectionOptions }
        );

        res.status(200).json(likedPosts);

    } catch (error) {
        console.error('Error in getLikedPosts controller:', error);
         if (error.message.includes('Invalid user ID format.')) {
             return res.status(401).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching liked posts.' });
    }
};
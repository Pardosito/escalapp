import { getDatabase } from './configdb.js';
import { ObjectId } from 'mongodb';
import { Route } from '../models/Route.js';
const imagesBaseDir = path.join(process.cwd(), 'images');
const videosBaseDir = path.join(process.cwd(), 'videos');
const ROUTES_COLLECTION = 'routes';
const findRoutes = async (query = {}, options = {}) => {
  try {
    const db = getDatabase();
    const routesCollection = db.collection(ROUTES_COLLECTION);

    let cursor = routesCollection.find(query);

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

    const routes = await cursor.toArray();

    return routes;

  } catch (error) {
    console.error('Error in findRoutes (DB logic):', error);
    throw error;
  }
};

const createRouteDB = async (routeDocument) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);

        const result = await routesCollection.insertOne(routeDocument);

        if (result.acknowledged) {
            return { insertedId: result.insertedId, acknowledged: true };
        } else {
            console.error('Database insertion not acknowledged for new route:', routeDocument);
            throw new Error('Route insertion not acknowledged by database.');
        }

    } catch (error) {
        console.error('Error in createRouteDB:', error);
        throw error;
    }
};


export const getRoutes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'likes';

    const skip = (page - 1) * limit;

    let sortOptions = {};
    if (sort === 'recent') {
      sortOptions = { _id: -1 };
    } else {
      sortOptions = { likes: -1 };
    }

    const projectionOptions = {
      _id: 1,
      title: 1,
      images: 1,
      likes: 1,
    };

    const routes = await findRoutes(
      {},
      {
        sort: sortOptions,
        skip: skip,
        limit: limit,
        projection: projectionOptions,
      }
    );

    res.status(200).json(routes);

  } catch (error) {
    console.error('Error in getRoutes controller:', error);
    res.status(500).json({ message: 'Internal server error fetching routes.' });
  }
};


export const createRoute = async (req, res) => {
    try {
        const creatorId = req.user.userId;

        const {
            title,
            description,
            difficultyLevel,
            climbType,
            geoLocation,
            accessCost,
            recommendedGear,
        } = req.body;

        if (!title || !description || !difficultyLevel || !climbType || !geoLocation) {
             return res.status(400).json({ message: 'Missing required route fields (title, description, difficultyLevel, climbType, geoLocation).' });
        }

        const uploadedImagesInfo = req.files && req.files.images ? req.files.images : [];
        const uploadedVideosInfo = req.files && req.files.videos ? req.files.videos : [];

        const imageUrls = uploadedImagesInfo.map(fileInfo => fileInfo.path || fileInfo.location).filter(Boolean);
        const videoUrls = uploadedVideosInfo.map(fileInfo => fileInfo.path || fileInfo.location).filter(Boolean);


        const newRouteData = {
            title,
            description,
            difficultyLevel,
            climbType,
            geoLocation,
            accessCost: accessCost !== undefined ? accessCost : 0,
            recommendedGear: recommendedGear || '',
            images: imageUrls,
            videos: videoUrls,
            creatorId: new ObjectId(creatorId),
        };


        const insertionResult = await createRouteDB(newRouteData);


        if (insertionResult && insertionResult.acknowledged) {
            res.status(201).json({
                message: 'Route created successfully.',
                routeId: insertionResult.insertedId,
            });
        } else {
             console.error('Route creation failed: DB did not acknowledge insertion.');
             res.status(500).json({ message: 'Route creation failed due to database issue.' });
        }


    } catch (error) {
        console.error('Error in createRoute controller:', error);

        res.status(500).json({ message: 'Internal server error during route creation.' });
    }
};

import fs from 'fs';
import path from 'path';


const findRouteByIdDB = async (routeId) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);
        const objectId = new ObjectId(routeId);
        const route = await routesCollection.findOne({ _id: objectId });
        return route;
    } catch (error) {
        console.error('Error in findRouteByIdDB:', error);
        if (error.message.includes('ObjectId')) {
            return null;
        }
        throw error;
    }
};

const deleteRouteDB = async (routeId) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);
        const objectId = new ObjectId(routeId);
        const result = await routesCollection.deleteOne({ _id: objectId });
        return result.deletedCount;
    } catch (error) {
        console.error('Error in deleteRouteDB:', error);
        throw error;
    }
};

export const deleteRoute = async (req, res) => {
    try {
        const routeId = req.params.id;

        if (!ObjectId.isValid(routeId)) {
            return res.status(400).json({ message: 'Invalid route ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        const routeToDelete = await findRouteByIdDB(routeId);

        if (!routeToDelete) {
            return res.status(404).json({ message: 'Route not found.' });
        }

        if (routeToDelete.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can delete this route.' });
        }

        const safeTitleFolderName = routeToDelete.title.replace(/\s+/g, '_').replace(/[^\w-]/g, '').toLowerCase();
        const safeUserIdFolderName = routeToDelete.creatorId.toString().replace(/\s+/g, '_').replace(/[^\w-]/g, '');

        const imagesFolderPath = path.join(imagesBaseDir, safeUserIdFolderName, safeTitleFolderName);
        const videosFolderPath = path.join(videosBaseDir, safeUserIdFolderName, safeTitleFolderName);

        fs.rm(imagesFolderPath, { recursive: true, force: true }, (err) => {
            if (err) console.error('Error deleting images folder:', imagesFolderPath, err);
        });

        fs.rm(videosFolderPath, { recursive: true, force: true }, (err) => {
             if (err) console.error('Error deleting videos folder:', videosFolderPath, err);
        });

        const deletedCount = await deleteRouteDB(routeId);

        if (deletedCount === 1) {
            res.status(200).json({ message: 'Route deleted successfully.' });
        } else {
             console.error('Route delete in DB failed, document not found after initial find:', routeId);
             res.status(500).json({ message: 'Route deletion failed in database.' });
        }

    } catch (error) {
        console.error('Error in deleteRoute controller:', error);
        res.status(500).json({ message: 'Internal server error during route deletion.' });
    }
};
export const getRouteById = async (req, res) => {
  try {
      const routeId = req.params.id;

      if (!ObjectId.isValid(routeId)) {
          return res.status(400).json({ message: 'Invalid route ID format.' });
      }

      const route = await findRouteByIdDB(routeId);

      if (!route) {
          return res.status(404).json({ message: 'Route not found.' });
      }

      res.status(200).json(route);

  } catch (error) {
      console.error('Error in getRouteById controller:', error);
      res.status(500).json({ message: 'Internal server error fetching route.' });
  }
};

const handleRouteLikeDB = async (userId, routeId, isLiking = true) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);
        const userRouteLikesCollection = db.collection(USER_ROUTE_LIKES_COLLECTION);

        const userObjectId = new ObjectId(userId);
        const routeObjectId = new ObjectId(routeId);

        let updateResult;
        let likeCountIncrement = 0;

        if (isLiking) {
            updateResult = await userRouteLikesCollection.updateOne(
                { userId: userObjectId },
                { $addToSet: { likedRouteIds: routeObjectId } },
                { upsert: true }
            );

            if (updateResult.modifiedCount === 1 || updateResult.upsertedId) {
                likeCountIncrement = 1;
            }

        } else {
             updateResult = await userRouteLikesCollection.updateOne(
                { userId: userObjectId },
                { $pull: { likedRouteIds: routeObjectId } }
            );

            if (updateResult.modifiedCount === 1) {
                likeCountIncrement = -1;
            }
        }

        if (likeCountIncrement !== 0) {
            await routesCollection.updateOne(
                { _id: routeObjectId },
                { $inc: { likes: likeCountIncrement } }
            );
        }

        return { likedStateChanged: likeCountIncrement !== 0 };

    } catch (error) {
        console.error('Error in handleRouteLikeDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user or route ID format.');
         }
        throw error;
    }
};

export const likeRoute = async (req, res) => {
    try {
        const routeId = req.params.id;

         if (!ObjectId.isValid(routeId)) {
            return res.status(400).json({ message: 'Invalid route ID format.' });
        }

        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }


        const result = await handleRouteLikeDB(userId, routeId, true);

        if (result && result.likedStateChanged) {
             res.status(200).json({ message: 'Route liked successfully.' });
        } else {
             res.status(200).json({ message: 'Route already liked by this user.' });
        }


    } catch (error) {
        console.error('Error in likeRoute controller:', error);
         if (error.message.includes('Invalid user or route ID format.')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during like operation.' });
    }
};
const USER_ROUTE_LIKES_COLLECTION = 'userroutelikes';

const findUserLikedRouteIdsDB = async (userId) => {
    try {
        const db = getDatabase();
        const userRouteLikesCollection = db.collection(USER_ROUTE_LIKES_COLLECTION);

        const userObjectId = new ObjectId(userId);

        const userLikesDocument = await userRouteLikesCollection.findOne(
            { userId: userObjectId },
            { projection: { likedRouteIds: 1 } }
        );

        return userLikesDocument && Array.isArray(userLikesDocument.likedRouteIds)
               ? userLikesDocument.likedRouteIds
               : [];

    } catch (error) {
        console.error('Error in findUserLikedRouteIdsDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};

export const getLikedRoutes = async (req, res) => {
    try {
        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const likedRouteIds = await findUserLikedRouteIdsDB(userId);

        if (!likedRouteIds || likedRouteIds.length === 0) {
            return res.status(200).json([]);
        }

        const projectionOptions = {
          _id: 1,
          title: 1,
          images: 1,
          likes: 1,
        };

        const likedRoutes = await findRoutes(
            { _id: { $in: likedRouteIds } },
            { projection: projectionOptions }
        );

        res.status(200).json(likedRoutes);

    } catch (error) {
        console.error('Error in getLikedRoutes controller:', error);
         if (error.message.includes('Invalid user ID format.')) {
             return res.status(401).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching liked routes.' });
    }
};
import { getDatabase } from './configdb.js';
import { ObjectId } from 'mongodb';
import { Profile } from '../models/Profile.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const USERS_COLLECTION = 'users';
const ROUTES_COLLECTION = 'routes';
const USER_ROUTE_LIKES_COLLECTION = 'userroutelikes';
const USER_CLIMBED_ROUTES_COLLECTION = 'userclimbedroutes';
const COMMUNITIES_COLLECTION = 'communities';
const CHALLENGE_PARTICIPANTS_COLLECTION = 'challengeparticipants';


const imagesBaseDir = path.join(__dirname, '..', 'images');


const findUserByIdDB = async (userId) => {
    try {
        const db = getDatabase();
        const usersCollection = db.collection(USERS_COLLECTION);
        const objectId = new ObjectId(userId);
        const projection = { password: 0 };

        const user = await usersCollection.findOne({ _id: objectId }, { projection: projection });
        return user;
    } catch (error) {
        console.error('Error in findUserByIdDB:', error);
         if (error.message.includes('ObjectId')) {
             return null;
         }
        throw error;
    }
};

const updateUserDB = async (userId, updateOperators) => {
    try {
        const db = getDatabase();
        const usersCollection = db.collection(USERS_COLLECTION);

        const objectId = new ObjectId(userId);

        const result = await usersCollection.updateOne(
            { _id: objectId },
            updateOperators
        );

        return result.modifiedCount;

    } catch (error) {
        console.error('Error in updateUserDB:', error);
        throw error;
    }
};


const findRoutesCreatedByUserDB = async (userId) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);
        const userObjectId = new ObjectId(userId);

        const projection = {
             _id: 1,
             title: 1,
             images: 1,
             difficultyLevel: 1,
             climbType: 1,
             likes: 1,
             createdAt: 1,
        };

        const routes = await routesCollection.find({ creatorId: userObjectId }).project(projection).toArray();
        return routes;

    } catch (error) {
        console.error('Error in findRoutesCreatedByUserDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};

const findRoutesLikedByUserDB = async (userId) => {
    try {
        const db = getDatabase();
        const userRouteLikesCollection = db.collection(USER_ROUTE_LIKES_COLLECTION);
        const routesCollection = db.collection(ROUTES_COLLECTION);

        const userObjectId = new ObjectId(userId);

        const userLikesDocument = await userRouteLikesCollection.findOne(
            { userId: userObjectId },
            { projection: { likedRouteIds: 1 } }
        );

        const likedRouteIds = userLikesDocument && Array.isArray(userLikesDocument.likedRouteIds)
               ? userLikesDocument.likedRouteIds
               : [];

        if (likedRouteIds.length === 0) {
            return [];
        }

        const projection = {
             _id: 1, title: 1, images: 1, difficultyLevel: 1, climbType: 1, likes: 1, createdAt: 1,
        };
        const likedRoutes = await routesCollection.find({ _id: { $in: likedRouteIds } }).project(projection).toArray();

        return likedRoutes;

    } catch (error) {
        console.error('Error in findRoutesLikedByUserDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};

const findRoutesClimbedByUserDB = async (userId) => {
     try {
        const db = getDatabase();
        const userClimbedRoutesCollection = db.collection(USER_CLIMBED_ROUTES_COLLECTION);
        const routesCollection = db.collection(ROUTES_COLLECTION);

        const userObjectId = new ObjectId(userId);

        const userClimbsDocument = await userClimbedRoutesCollection.findOne(
            { userId: userObjectId },
            { projection: { climbedRoutes: 1 } }
        );

        const climbedRouteIds = userClimbsDocument && Array.isArray(userClimbsDocument.climbedRoutes)
               ? userClimbsDocument.climbedRoutes.map(climb => climb.routeId)
               : [];

         if (climbedRouteIds.length === 0) {
            return [];
         }

        const projection = {
             _id: 1, title: 1, images: 1, difficultyLevel: 1, climbType: 1, likes: 1, createdAt: 1,
        };
        const climbedRoutes = await routesCollection.find({ _id: { $in: climbedRouteIds } }).project(projection).toArray();

        return climbedRoutes;

    } catch (error) {
        console.error('Error in findRoutesClimbedByUserDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};


const findCommunitiesJoinedByUserDB = async (userId) => {
    try {
        const db = getDatabase();
        const communitiesCollection = db.collection(COMMUNITIES_COLLECTION);
        const userObjectId = new ObjectId(userId);

        const projection = {
             _id: 1,
             name: 1,
             image: 1,
             description: 1,
             memberCount: 1,
             createdAt: 1,
        };


        const communities = await communitiesCollection.find({ memberIds: userObjectId }).project(projection).toArray();
        return communities;

    } catch (error) {
        console.error('Error in findCommunitiesJoinedByUserDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};


const findChallengesParticipatedByUserDB = async (userId) => {
    try {
        const db = getDatabase();
        const challengeParticipantsCollection = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION);
        const challengesCollection = db.collection(CHALLENGES_COLLECTION);

        const userObjectId = new ObjectId(userId);

        const userParticipations = await challengeParticipantsCollection.find(
            { userId: userObjectId },
            { projection: { challengeId: 1 } }
        ).toArray();

        const participatedChallengeIds = userParticipations.map(p => p.challengeId);

        if (participatedChallengeIds.length === 0) {
            return [];
        }

         const projection = {
             _id: 1, title: 1, image: 1, startDate: 1, endDate: 1, maxParticipants: 1, currentParticipants: 1, status: 1,
         };
        const challenges = await challengesCollection.find({ _id: { $in: participatedChallengeIds } }).project(projection).toArray();

        return challenges;

    } catch (error) {
        console.error('Error in findChallengesParticipatedByUserDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user ID format.');
         }
        throw error;
    }
};


export const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
             console.error('Invalid user ID from token in getMyProfile:', userId);
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const userProfile = await findUserByIdDB(userId);

        if (!userProfile) {
             console.error('User not found in DB for valid token ID:', userId);
            return res.status(404).json({ message: 'User profile not found.' });
        }

        res.status(200).json(userProfile);

    } catch (error) {
        console.error('Error in getMyProfile controller:', error);
        res.status(500).json({ message: 'Internal server error fetching profile.' });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }

        const userProfile = await findUserByIdDB(userId);

        if (!userProfile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

         const publicProfile = {
              _id: userProfile._id,
              username: userProfile.username,
              avatarUrl: userProfile.avatarUrl,
              biography: userProfile.biography,
         };

        res.status(200).json(publicProfile);

    } catch (error) {
        console.error('Error in getUserProfile controller:', error);
        res.status(500).json({ message: 'Internal server error fetching user profile.' });
    }
};


export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
             console.error('Invalid user ID from token in updateMyProfile:', userId);
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const currentUser = await findUserByIdDB(userId);

        if (!currentUser) {
             console.error('User not found in DB for valid token ID during update:', userId);
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const updateOperators = {};
        const setOperator = {};
        const unsetOperator = {};


        const {
            username,
            biography,
        } = req.body;


        if (username !== undefined) {
             if (typeof username !== 'string' || username.length === 0) {
                 return res.status(400).json({ message: 'Username must be a non-empty string.' });
             }
             if (username !== currentUser.username) {
                  const existingUser = await getDatabase().collection(USERS_COLLECTION).findOne({ username: username }, { projection: { _id: 1 } });
                  if (existingUser && existingUser._id.toString() !== userId) {
                       return res.status(409).json({ message: 'Username already exists.' });
                  }
             }
            setOperator.username = username;
        }

        if (biography !== undefined) {
             if (typeof biography !== 'string') {
                  return res.status(400).json({ message: 'Biography must be a string.' });
             }
            setOperator.biography = biography;
        }


        const avatarFile = req.file;
        const deleteExistingAvatar = req.body.deleteExistingAvatar === 'true';


        if (avatarFile) {
            const newAvatarPathToStore = path.relative(imagesBaseDir, avatarFile.path);
            setOperator.avatarUrl = newAvatarPathToStore;

             if (currentUser.avatarUrl) {
                 const oldAvatarPhysicalPath = path.join(imagesBaseDir, currentUser.avatarUrl);
                 fs.promises.unlink(oldAvatarPhysicalPath).catch(err => {
                     console.error('Error deleting old avatar image:', oldAvatarPhysicalPath, err);
                 });
            }

        } else if (deleteExistingAvatar && currentUser.avatarUrl) {
            unsetOperator.avatarUrl = "";
             const oldAvatarPhysicalPath = path.join(imagesBaseDir, currentUser.avatarUrl);
             fs.promises.unlink(oldAvatarPhysicalPath).catch(err => {
                 console.error('Error deleting avatar image marked for deletion:', oldAvatarPhysicalPath, err);
             });
        }


        if (Object.keys(setOperator).length > 0) {
            updateOperators.$set = setOperator;
        }
        if (Object.keys(unsetOperator).length > 0) {
            updateOperators.$unset = unsetOperator;
        }

        if (Object.keys(updateOperators).length === 0) {
             if (avatarFile) {
                  const orphanedAvatarPhysicalPath = avatarFile.path || avatarFile.location;
                   fs.promises.unlink(orphanedAvatarPhysicalPath).catch(err => {
                        console.error('Error cleaning up orphaned uploaded new avatar:', orphanedAvatarPhysicalPath, cleanupErr);
                   });
             }
             return res.status(200).json({ message: 'No fields or new avatar provided for update.' });
        }


        const modifiedCount = await updateUserDB(userId, updateOperators);

        if (modifiedCount === 1) {
            res.status(200).json({ message: 'User profile updated successfully.' });
        } else {
             console.error('User profile update in DB resulted in unexpected modifiedCount:', modifiedCount, 'for user ID:', userId);
             res.status(200).json({ message: 'User profile found, but no changes were made or update failed.' });
        }


    } catch (error) {
        console.error('Error in updateMyProfile controller:', error);
         if (req.file) {
              const orphanedAvatarPhysicalPath = req.file.path;
              fs.promises.unlink(orphanedAvatarPhysicalPath).catch(cleanupErr => {
                   console.error('Error cleaning up orphaned uploaded avatar after controller error:', orphanedAvatarPhysicalPath, cleanupErr);
              });
         }
        res.status(500).json({ message: 'Internal server error during profile update.' });
    }
};


export const getMyCreatedRoutes = async (req, res) => {
    try {
        const userId = req.user.userId;
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }
        const routes = await findRoutesCreatedByUserDB(userId);
        res.status(200).json(routes);
    } catch (error) {
        console.error('Error in getMyCreatedRoutes controller:', error);
         if (error.message.includes('Invalid user ID format.')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching created routes.' });
    }
};

export const getMyLikedRoutes = async (req, res) => {
    try {
        const userId = req.user.userId;
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }
        const routes = await findRoutesLikedByUserDB(userId);
        res.status(200).json(routes);
    } catch (error) {
        console.error('Error in getMyLikedRoutes controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching liked routes.' });
    }
};

export const getMyClimbedRoutes = async (req, res) => {
     try {
        const userId = req.user.userId;
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }
        const routes = await findRoutesClimbedByUserDB(userId);
        res.status(200).json(routes);
    } catch (error) {
        console.error('Error in getMyClimbedRoutes controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching climbed routes.' });
    }
};


export const getMyCommunities = async (req, res) => {
    try {
        const userId = req.user.userId;
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }
        const communities = await findCommunitiesJoinedByUserDB(userId);
        res.status(200).json(communities);
    } catch (error) {
        console.error('Error in getMyCommunities controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching user communities.' });
    }
};


export const getMyChallenges = async (req, res) => {
    try {
        const userId = req.user.userId;
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }
        const challenges = await findChallengesParticipatedByUserDB(userId);
        res.status(200).json(challenges);
    } catch (error) {
        console.error('Error in getMyChallenges controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error fetching user challenges.' });
    }
};
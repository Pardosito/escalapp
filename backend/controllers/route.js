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

        const imageUrls = uploadedImagesInfo.map(fileInfo => {
             return path.relative(imagesBaseDir, fileInfo.path);
        }).filter(Boolean);

        const videoUrls = uploadedVideosInfo.map(fileInfo => {
             return path.relative(videosBaseDir, fileInfo.path);
        }).filter(Boolean);


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

        // Recopilar todas las rutas de archivos (relativas) de imágenes y videos
        const filesToDeletePhysically = [...routeToDelete.images, ...routeToDelete.videos];

        // Eliminar archivos físicos (asíncronamente)
        if (filesToDeletePhysically.length > 0) {
             filesToDeletePhysically.forEach(filePath => {
                 // Necesitamos saber si es una imagen o un video para usar la base dir correcta
                 // Verificamos en qué array estaba originalmente la ruta (más robusto)
                 const isImage = routeToDelete.images.includes(filePath);
                 const isVideo = routeToDelete.videos.includes(filePath);

                 let fullPhysicalPath = null;
                 if (isImage) {
                      fullPhysicalPath = path.join(imagesBaseDir, filePath);
                 } else if (isVideo) {
                      fullPhysicalPath = path.join(videosBaseDir, filePath);
                 } else {
                      // Esto no debería pasar si las rutas en DB son correctas y corresponden a los arrays
                      console.error('Path in DB not found in original route images/videos arrays:', filePath);
                      return; // No intentes eliminar si no sabemos su base dir
                 }

                 if (fullPhysicalPath) {
                     fs.promises.unlink(fullPhysicalPath).catch(err => {
                          console.error('Error deleting file during delete:', fullPhysicalPath, err);
                     });
                 }
             });
        }

        // La eliminación de carpetas padre vacías no se maneja aquí. Podría requerir un proceso de limpieza separado.


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

const EDITABLE_ROUTE_FIELDS = [
    'title',
    'description',
    'difficultyLevel',
    'geoLocation',
    'accessCost',
    'climbType',
    'recommendedGear',
];

const updateRouteDB = async (routeId, updateOperators) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);

        const objectId = new ObjectId(routeId);

        const result = await routesCollection.updateOne(
            { _id: objectId },
            updateOperators
        );

        return result.modifiedCount;

    } catch (error) {
        console.error('Error in updateRouteDB:', error);
        throw error;
    }
};
export const updateRoute = async (req, res) => {
    try {
        const routeId = req.params.id;

        if (!ObjectId.isValid(routeId)) {
            return res.status(400).json({ message: 'Invalid route ID format.' });
        }

        const authenticatedUserId = req.user.userId;

        const routeToUpdate = await findRouteByIdDB(routeId);

        if (!routeToUpdate) {
            return res.status(404).json({ message: 'Route not found.' });
        }

        if (routeToUpdate.creatorId.toString() !== new ObjectId(authenticatedUserId).toString()) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can edit this route.' });
        }

        const updateOperators = {};
        const setOperator = {};
        const pullOperator = {};
        const pushOperator = {};

        const EDITABLE_ROUTE_FIELDS = [
            'title',
            'description',
            'difficultyLevel',
            'geoLocation',
            'accessCost',
            'climbType',
            'recommendedGear',
        ];

        for (const field of EDITABLE_ROUTE_FIELDS) {
            if (req.body[field] !== undefined) {
                setOperator[field] = req.body[field];
            }
        }

        const filesToDelete = Array.isArray(req.body.filesToDelete) ? req.body.filesToDelete : [];
        if (filesToDelete.length > 0) {
             pullOperator.images = { $in: filesToDelete };
             pullOperator.videos = { $in: filesToDelete };
        }


        const uploadedImagesInfo = req.files && req.files.images ? req.files.images : [];
        const uploadedVideosInfo = req.files && req.files.videos ? req.files.videos : [];

        const newImageUrls = uploadedImagesInfo.map(fileInfo => {
             return path.relative(imagesBaseDir, fileInfo.path);
        }).filter(Boolean);

        const newVideoUrls = uploadedVideosInfo.map(fileInfo => {
             return path.relative(videosBaseDir, fileInfo.path);
        }).filter(Boolean);

        if (newImageUrls.length > 0) {
             pushOperator.images = { $each: newImageUrls };
        }
        if (newVideoUrls.length > 0) {
             pushOperator.videos = { $each: newVideoUrls };
        }

        setOperator.lastUpdated = new Date();


        if (Object.keys(setOperator).length > 0) {
            updateOperators.$set = setOperator;
        }
        if (Object.keys(pullOperator).length > 0) {
            updateOperators.$pull = pullOperator;
        }
        if (Object.keys(pushOperator).length > 0) {
            updateOperators.$push = pushOperator;
        }

        if (Object.keys(updateOperators).length === 0) {
             // Si no hay operadores de actualización pero se subieron nuevos archivos, esos archivos son huérfanos.
             // Necesitamos borrarlos.
             if (newImageUrls.length > 0 || newVideoUrls.length > 0) {
                 // Se eliminan los archivos físicos que Multer guardó
                 uploadedImagesInfo.forEach(fileInfo => {
                     fs.promises.unlink(fileInfo.path || fileInfo.location).catch(err => {
                         console.error('Error deleting unused uploaded new image:', fileInfo.path, err);
                     });
                 });
                 uploadedVideosInfo.forEach(fileInfo => {
                     fs.promises.unlink(fileInfo.path || fileInfo.location).catch(err => {
                         console.error('Error deleting unused uploaded new video:', fileInfo.path, err);
                     });
                 });
             }
             return res.status(200).json({ message: 'No updatable fields or new files provided.' });
        }

        // Eliminar archivos físicos antiguos (asíncronamente)
        // Iterar sobre los paths de los archivos a eliminar (que son las rutas relativas guardadas en DB)
        if (filesToDelete.length > 0) {
            filesToDelete.forEach(filePath => {
                 // Necesitamos saber si es una imagen o un video para usar la base dir correcta
                 // Buscamos el path en los arrays originales del documento de la DB
                 const isImage = routeToUpdate.images.includes(filePath);
                 const isVideo = routeToUpdate.videos.includes(filePath);

                 let fullPhysicalPath = null;
                 if (isImage) {
                     fullPhysicalPath = path.join(imagesBaseDir, filePath);
                 } else if (isVideo) {
                      fullPhysicalPath = path.join(videosBaseDir, filePath);
                 } else {
                     // Si el path a eliminar no está en los arrays originales, es un error en la lista del frontend
                     console.error('Path to delete not found in original route images/videos arrays:', filePath);
                     return;
                 }

                 if (fullPhysicalPath) {
                     fs.promises.unlink(fullPhysicalPath).catch(err => {
                         console.error('Error deleting old file:', fullPhysicalPath, err);
                     });
                 }
            });
        }


        const modifiedCount = await updateRouteDB(routeId, updateOperators);

        if (modifiedCount === 1) {
            res.status(200).json({ message: 'Route updated successfully.' });
        } else if (modifiedCount === 0) {
             res.status(200).json({ message: 'Route found, but no changes were made.' });
        }
        else {
             console.error('Route update in DB resulted in unexpected modifiedCount:', modifiedCount, 'for route ID:', routeId);
             res.status(500).json({ message: 'Route update failed in database.' });
        }

    } catch (error) {
        console.error('Error in updateRoute controller:', error);
        // Si ocurre un error DESPUÉS de que Multer guardó archivos, esos archivos son huérfanos.
        // Necesitamos limpiarlos.
        if (req.files) {
            const uploadedFiles = [...(req.files.images || []), ...(req.files.videos || [])];
            uploadedFiles.forEach(fileInfo => {
                 const orphanedPhysicalPath = fileInfo.path || fileInfo.location;
                 fs.promises.unlink(orphanedPhysicalPath).catch(cleanupErr => {
                      console.error('Error cleaning up orphaned uploaded file after controller error:', orphanedPhysicalPath, cleanupErr);
                 });
            });
        }
        res.status(500).json({ message: 'Internal server error during route update.' });
    }
};
export const unlikeRoute = async (req, res) => {
    try {
        const routeId = req.params.id;

         if (!ObjectId.isValid(routeId)) {
            return res.status(400).json({ message: 'Invalid route ID format.' });
        }

        const userId = req.user.userId;

         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const result = await handleRouteLikeDB(userId, routeId, false);

        if (result && result.likedStateChanged) {
             res.status(200).json({ message: 'Route unliked successfully.' });
        } else {
             res.status(200).json({ message: 'Route was not liked by this user.' });
        }

    } catch (error) {
        console.error('Error in unlikeRoute controller:', error);
         if (error.message.includes('Invalid user or route ID format.')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during unlike operation.' });
    }
};
const USER_CLIMBED_ROUTES_COLLECTION = 'userclimbedroutes';

const handleRouteCompletionDB = async (userId, routeId, action) => {
    try {
        const db = getDatabase();
        const routesCollection = db.collection(ROUTES_COLLECTION);
        const userClimbedRoutesCollection = db.collection(USER_CLIMBED_ROUTES_COLLECTION);

        const userObjectId = new ObjectId(userId);
        const routeObjectId = new ObjectId(routeId);
        const currentTime = new Date();
        const undoWindowMilliseconds = 10 * 60 * 1000;

        if (action === 'complete') {
            const alreadyCompleted = await userClimbedRoutesCollection.findOne(
                 { userId: userObjectId, 'climbedRoutes.routeId': routeObjectId }
            );

            if (alreadyCompleted) {
                 return { status: 'conflict', message: 'Route already marked as completed by this user.' };
            }

            await userClimbedRoutesCollection.updateOne(
                { userId: userObjectId },
                {
                    $push: {
                        climbedRoutes: {
                            routeId: routeObjectId,
                            completedAt: currentTime
                        }
                    }
                },
                { upsert: true }
            );

            await routesCollection.updateOne(
                { _id: routeObjectId },
                { $inc: { climbedCount: 1 } }
            );

            return { status: 'success', action: 'complete' };

        } else if (action === 'undo') {
            const userClimb = await userClimbedRoutesCollection.findOne(
                 { userId: userObjectId, 'climbedRoutes.routeId': routeObjectId }
                 , { projection: { climbedRoutes: 1 } }
            );

            if (!userClimb || !Array.isArray(userClimb.climbedRoutes)) {
                 return { status: 'notfound', message: 'Completion record not found for this route and user.' };
            }

            const completionEntry = userClimb.climbedRoutes.find(entry => entry.routeId.equals(routeObjectId));

            if (!completionEntry) {
                 return { status: 'notfound', message: 'Completion record not found for this route and user.' };
            }

            const completedAt = completionEntry.completedAt;
            const timeDifference = currentTime.getTime() - completedAt.getTime();

            if (timeDifference > undoWindowMilliseconds) {
                 return { status: 'forbidden', message: 'Undo window (10 minutes) has expired.' };
            }

            await userClimbedRoutesCollection.updateOne(
                { userId: userObjectId },
                { $pull: { climbedRoutes: { routeId: routeObjectId } } }
            );

            await routesCollection.updateOne(
                { _id: routeObjectId },
                { $inc: { climbedCount: -1 } }
            );

            return { status: 'success', action: 'undo' };

        } else {
             return { status: 'badrequest', message: 'Invalid action specified (use "complete" or "undo").' };
        }

    } catch (error) {
        console.error('Error in handleRouteCompletionDB:', error);
         if (error.message.includes('ObjectId')) {
             throw new Error('Invalid user or route ID format.');
         }
        throw error;
    }
};

export const handleRouteCompletion = async (req, res) => {
    try {
        const routeId = req.params.id;
        const userId = req.user.userId;

         if (!ObjectId.isValid(routeId)) {
            return res.status(400).json({ message: 'Invalid route ID format.' });
        }
         if (!ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid user ID in token.' });
        }

        const action = req.body.action;

        const result = await handleRouteCompletionDB(userId, routeId, action);

        if (result.status === 'success') {
            res.status(200).json({ message: `Route marked as ${result.action} successfully.` });
        } else if (result.status === 'conflict') {
            res.status(409).json({ message: result.message });
        } else if (result.status === 'notfound') {
             res.status(404).json({ message: result.message });
        } else if (result.status === 'forbidden') {
            res.status(403).json({ message: result.message });
        } else if (result.status === 'badrequest') {
             res.status(400).json({ message: result.message });
        } else {
             console.error('Unexpected result status from handleRouteCompletionDB:', result);
             res.status(500).json({ message: 'Internal server error processing completion.' });
        }


    } catch (error) {
        console.error('Error in handleRouteCompletion controller:', error);
         if (error.message.includes('ObjectId')) {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Internal server error during completion operation.' });
    }
};
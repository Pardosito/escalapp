import express from 'express';
import { getRoutes, createRoute, deleteRoute, getRouteById, likeRoute, getLikedRoutes, updateRoute} from '../controllers/route.js';
import {verifyJWT} from '../controllers/login.js';
import {uploadRouteFiles} from '../controllers/uploadroutefiles.js';
const router = express.Router();

router.get('/', getRoutes);
router.post('/', verifyJWT, uploadRouteFiles, createRoute);
router.delete('/:id', verifyJWT, deleteRoute);
router.get('/:id', getRouteById);
router.post('/:id/like', verifyJWT, likeRoute);
router.get('/liked', verifyJWT, getLikedRoutes);
router.patch('/:id', verifyJWT, uploadRouteFiles, updateRoute);
export default router;
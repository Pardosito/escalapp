import express from 'express';
import {
    getMyProfile,
    getUserProfile,
    updateMyProfile,
    getMyCreatedRoutes,
    getMyLikedRoutes,
    getMyClimbedRoutes,
    getMyCommunities,
    getMyChallenges,
} from '../controllers/profile.js';
import { verifyJWT } from '../controllers/login.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const avatarsUploadDir = path.join(__dirname, '..', 'images', 'avatars');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user && req.user.userId ? req.user.userId.toString() : null;

    if (!userId) {
      return cb(new Error('User ID not available for upload folder.'), null);
    }

    const userAvatarPath = path.join(avatarsUploadDir, userId);

    fs.mkdir(userAvatarPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating avatar upload directory:', err);
        return cb(err, null);
      }
      cb(null, userAvatarPath);
    });
  },

  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname);
    cb(null, 'avatar' + fileExtension.toLowerCase());
  }
});

const uploadAvatar = multer({ storage: storage }).single('avatar');


const router = express.Router();


router.get('/me', verifyJWT, getMyProfile);
router.patch('/me', verifyJWT, uploadAvatar, updateMyProfile);

router.get('/me/created-routes', verifyJWT, getMyCreatedRoutes);
router.get('/me/liked-routes', verifyJWT, getMyLikedRoutes);
router.get('/me/climbed-routes', verifyJWT, getMyClimbedRoutes);
router.get('/me/communities', verifyJWT, getMyCommunities);
router.get('/me/challenges', verifyJWT, getMyChallenges);


router.get('/:id', getUserProfile);


export default router;
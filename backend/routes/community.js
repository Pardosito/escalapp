import express from 'express';
import {
    createCommunity,
    getCommunities,
    getCommunityById,
    updateCommunity,
    deleteCommunity,
    joinCommunity,
    leaveCommunity,
    removeMember,
    addAdmin,
    removeAdmin,
    addChallengeToCommunity,
    removeChallengeFromCommunity,
    getCommunityMembers,
    getCommunityAdmins,
    getCommunityChallenges,
} from '../controllers/community.js';
import { verifyJWT } from '../controllers/login.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';


const baseUploadDir = path.join(process.cwd(), 'images');
const communitiesUploadDir = path.join(baseUploadDir, 'communities');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user && req.user.userId ? req.user.userId.toString() : null;

    if (!userId) {
      return cb(new Error('User ID not available for upload folder.'), null);
    }

     const safeUserIdFolderName = userId.replace(/\s+/g, '_').replace(/[^\w-]/g, '');

    const uploadPath = path.join(communitiesUploadDir, safeUserIdFolderName);

    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating community upload directory:', err);
        return cb(err, null);
      }
      cb(null, uploadPath);
    });
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'community-' + uniqueSuffix + uniqueSuffix + fileExtension);
  }
});


const uploadCommunityImage = multer({ storage: storage }).single('image');


const router = express.Router();


router.get('/', getCommunities);
router.get('/:id', getCommunityById);
router.get('/:id/members', getCommunityMembers);
router.get('/:id/admins', getCommunityAdmins);
router.get('/:id/challenges', getCommunityChallenges);


router.post('/', verifyJWT, uploadCommunityImage, createCommunity);
router.patch('/:id', verifyJWT, uploadCommunityImage, updateCommunity);
router.delete('/:id', verifyJWT, deleteCommunity);

router.post('/:id/join', verifyJWT, joinCommunity);
router.post('/:id/leave', verifyJWT, leaveCommunity);

router.post('/:id/members/:memberId/remove', verifyJWT, removeMember);
router.post('/:id/admins/:userId/add', verifyJWT, addAdmin);
router.post('/:id/admins/:userId/remove', verifyJWT, removeAdmin);
router.post('/:id/challenges/:challengeId/add', verifyJWT, addChallengeToCommunity);
router.post('/:id/challenges/:challengeId/remove', verifyJWT, removeChallengeFromCommunity);


export default router;
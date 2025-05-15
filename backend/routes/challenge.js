import express from 'express';
import { createChallenge, getChallenges, getChallengeById, updateChallenge, deleteChallenge, registerForChallenge, unregisterFromChallenge, getChallengeParticipants, getUserChallenges } from '../controllers/challenge.js';
import { verifyJWT } from '../controllers/login.js'; // O donde tengas tu middleware de autenticación

import multer from 'multer';
import path from 'path';
import fs from 'fs';


const baseUploadDir = path.join(process.cwd(), 'images');
const challengesUploadDir = path.join(baseUploadDir, 'challenges');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user && req.user.userId ? req.user.userId.toString() : null;

    if (!userId) {
      return cb(new Error('User ID not available for upload folder.'), null);
    }

     const safeUserIdFolderName = userId.replace(/\s+/g, '_').replace(/[^\w-]/g, '');

    const uploadPath = path.join(challengesUploadDir, safeUserIdFolderName);

    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating challenge upload directory:', err);
        return cb(err, null);
      }
      cb(null, uploadPath);
    });
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'challenge-' + uniqueSuffix + fileExtension);
  }
});


const uploadChallengeImage = multer({ storage: storage }).single('image');


const router = express.Router();


router.get('/', getChallenges);
router.get('/:id', getChallengeById);
router.get('/:id/participants', getChallengeParticipants);

router.post('/', verifyJWT, uploadChallengeImage, createChallenge);
router.patch('/:id', verifyJWT, uploadChallengeImage, updateChallenge);
router.delete('/:id', verifyJWT, deleteChallenge);
router.post('/:id/register', verifyJWT, registerForChallenge);
router.post('/:id/unregister', verifyJWT, unregisterFromChallenge);
router.get('/registered', verifyJWT, getUserChallenges);


export default router;
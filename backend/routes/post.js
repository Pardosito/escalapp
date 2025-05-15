import express from 'express';
import { createPost, getPosts, getPostById, updatePost, deletePost, likePost, unlikePost, getLikedPosts } from '../controllers/post.js';
import { verifyJWT } from '../controllers/login.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


const baseUploadDir = path.join(process.cwd(), 'images');
const postsUploadDir = path.join(baseUploadDir, 'posts');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user && req.user.userId ? req.user.userId.toString() : null;

    if (!userId) {
      return cb(new Error('User ID not available for upload folder.'), null);
    }

     const safeUserIdFolderName = userId.replace(/\s+/g, '_').replace(/[^\w-]/g, '');

    const uploadPath = path.join(postsUploadDir, safeUserIdFolderName);

    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating post upload directory:', err);
        return cb(err, null);
      }
      cb(null, uploadPath);
    });
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'post-' + uniqueSuffix + fileExtension);
  }
});

const uploadPostPhoto = multer({ storage: storage }).single('photo');


const router = express.Router();


router.get('/', getPosts);
router.get('/:id', getPostById);

router.post('/', verifyJWT, uploadPostPhoto, createPost);
router.patch('/:id', verifyJWT, uploadPostPhoto, updatePost);
router.delete('/:id', verifyJWT, deletePost);
router.post('/:id/like', verifyJWT, likePost);
router.post('/:id/unlike', verifyJWT, unlikePost);
router.get('/liked', verifyJWT, getLikedPosts);


export default router;
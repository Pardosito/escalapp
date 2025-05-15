import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imagesBaseDir = path.join(__dirname, '..', 'images');
const videosBaseDir = path.join(__dirname, '..', 'videos');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user && req.user.userId ? req.user.userId.toString() : null;

    const routeTitle = req.body.title;

    if (!userId) {
      return cb(new Error('User ID not available for upload folder.'), null);
    }

    if (!routeTitle) {
      return cb(new Error('Route title is required to create upload folder.'), null);
    }

    const safeTitleFolderName = routeTitle.replace(/\s+/g, '_').replace(/[^\w-]/g, '').toLowerCase();
    const safeUserIdFolderName = userId.replace(/\s+/g, '_').replace(/[^\w-]/g, '');


    let baseDirForField;
    if (file.fieldname === 'images') {
        baseDirForField = imagesBaseDir;
    } else if (file.fieldname === 'videos') {
        baseDirForField = videosBaseDir;
    } else {
        return cb(new Error('Unexpected file field: ' + file.fieldname), null);
    }

    const uploadPath = path.join(baseDirForField, safeUserIdFolderName, safeTitleFolderName);

    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating upload directory:', err);
        return cb(err, null);
      }
      cb(null, uploadPath);
    });
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({ storage: storage });

export const uploadRouteFiles = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]);
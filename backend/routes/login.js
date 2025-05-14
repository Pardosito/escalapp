import express from 'express';
import {registerUser, loginUser, refreshToken} from '../controllers/login.js'; 
const router = express.Router();
router.post('/', registerUser);
router.get('/', loginUser);
router.post('/refresh', refreshToken);
export default router;
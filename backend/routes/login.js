import express from 'express';
import {registerUser, loginUser, refreshToken, logoutUser} from '../controllers/login.js'; 
const router = express.Router();
router.post('/', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
export default router;
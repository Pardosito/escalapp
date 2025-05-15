import express from 'express';
import { performSearch } from '../controllers/search.js';

const router = express.Router();


router.get('/', performSearch);


export default router;
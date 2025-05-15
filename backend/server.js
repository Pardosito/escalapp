import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectToDatabase } from './controllers/configdb.js';
import login from './routes/login.js';
import route from './routes/route.js';
import post from './routes/post.js';
dotenv.config();

console.log('Verifying JWT_SECRET...');
if (!process.env.JWTSECRET) {
    console.error('FATAL ERROR: Environment variable JWT_SECRET is not defined.');
    console.error('Please set the JWT_SECRET in your .env file or environment.');
    process.exit(1);
}
console.log('JWT_SECRET successfully loaded and verified.');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use('/login', login);
app.use('/route', route);
app.use('/post', post);
connectToDatabase()
  .then(() => {
    console.log('Database connection established. Starting server...');
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch(err => {
      console.error('Database connection failed:', err);
      process.exit(1);
  });
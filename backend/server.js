import express from 'express';
import dotenv from 'dotenv';
import {connectToDatabase} from './controllers/configdb.js';
import login from './routes/login.js';
dotenv.config();
console.log('Verifying JWT_SECRET...');
if (!process.env.JWTSECRET) {
    console.error('FATAL ERROR: Environment variable JWT_SECRET is not defined.');
    console.error('Please set the JWT_SECRET in your .env file or environment.');
    process.exit(1);}
console.log('JWT_SECRET successfully loaded and verified.');
const app = express();
const port = process.env.PORT  || 3000;
app.use(express.json())
app.use('/login', login);
connectToDatabase()
  .then(() => {
    console.log('Database connection established. Starting server...');
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  
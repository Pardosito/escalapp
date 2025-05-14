
import { getDatabase } from './configdb.js'
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';


const JWTSECRET = process.env.JWTSECRET;
const REFRESHTOKENSCOLLECTION = 'refreshtokens';
const USERSCOLLECTION = 'users';

export const registerUser = async (req, res) => {
  try {
    const db = getDatabase();
    const usersCollection = db.collection(USERSCOLLECTION);

    const  {username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields (username, email, password).' });
    }

    const existingUserByUsername = await usersCollection.findOne({ username: username });
    if (existingUserByUsername) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const existingUserByEmail = await usersCollection.findOne({ email: email });
    if (existingUserByEmail) {
       return res.status(409).json({ message: 'Email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserDocument = {
      username: username,
      email: email,
      passwordHash: hashedPassword,
      createdAt: new Date()
    };

    const insertionResult = await usersCollection.insertOne(newUserDocument);

    if (insertionResult.acknowledged) {
        res.status(201).json({
            message: 'User registered successfully.',
            userId: insertionResult.insertedId,
            username: newUserDocument.username,
            email: newUserDocument.email
        });
    } else {
        console.error('Insertion not acknowledged for new user:', newUserDocument);
        res.status(500).json({ message: 'User registration failed (DB not acknowledged).' });
    }


  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ message: 'Internal server error during user registration.' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const identifier = req.query.emailOrUsername;
    const password = req.query.password;

    if (!identifier || !password) {
       return res.status(400).json({ message: 'Missing required fields (identifier, password).' });
    }
    const db = getDatabase();
    const usersCollection = db.collection(USERSCOLLECTION);
    const refreshTokensCollection = db.collection('refreshTokens');

    const user = await usersCollection.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
       return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      userId: user._id,
      username: user.username
    };

    if (!JWTSECRET) {
        console.error("JWTSECRET is not defined in loginUser function scope.");
         return res.status(500).json({ message: 'Server configuration error.' });
    }

    const token = jwt.sign(payload, JWTSECRET, { expiresIn: '1h' });
    const cookieOptions = {
        httpOnly: true,
        maxAge: 3600 * 1000,
        sameSite: 'Lax',
        path: '/'
    }
    res.cookie('token', token, cookieOptions);

    const refreshTokenExpiresInSeconds = 7 * 24 * 60 * 60;
    const refreshToken = crypto.randomBytes(32).toString('hex');

    const refreshTokenDocument = {
        userId: user._id,
        token: refreshToken,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds * 1000)
    };

    if (!refreshTokensCollection) {
         console.error("refreshTokensCollection is not defined in loginUser function scope.");
          return res.status(500).json({ message: 'Server configuration error (refresh tokens).' });
    }

    await refreshTokensCollection.deleteMany({ userId: user._id, expiresAt: { $lt: new Date() } });
    await refreshTokensCollection.insertOne(refreshTokenDocument);

    const refreshTokenCookieOptions = {
      httpOnly: true,
      maxAge: refreshTokenExpiresInSeconds * 1000,
      sameSite: 'Lax',
      path: '/login/refresh',
    };

    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      message: 'Login successful.',
      userId: user._id,
      username: user.username
    });

  } catch (error) {
    console.error('Error in loginUser:', error);
     res.status(500).json({ message: 'Internal server error during login.' });
  }
};


export const refreshToken = async (req, res) => {
  try {
      const db = getDatabase();
      const usersCollection = db.collection(USERSCOLLECTION);
      const refreshTokensCollection = db.collection(REFRESHTOKENSCOLLECTION);

      const { refreshToken } = req.cookies;

      if (!refreshToken) {
          return res.status(401).json({ message: 'Refresh token not provided.' });
      }

      const refreshTokenDocument = await refreshTokensCollection.findOne({ token: refreshToken });

      if (!refreshTokenDocument || new Date() > refreshTokenDocument.expiresAt) {
          if (refreshTokenDocument) {
               await refreshTokensCollection.deleteOne({ _id: refreshTokenDocument._id });
          }
          return res.status(401).json({ message: 'Invalid or expired refresh token. Please log in again.' });
      }

      const user = await usersCollection.findOne({ _id: refreshTokenDocument.userId });

      if (!user) {
           await refreshTokensCollection.deleteOne({ _id: refreshTokenDocument._id });
           return res.status(401).json({ message: 'User associated with refresh token not found. Please log in again.' });
      }

      await refreshTokensCollection.deleteOne({ _id: refreshTokenDocument._id });

      const jwtPayload = {
          userId: user._id,
          username: user.username
      };

      const jwtExpiresInSeconds = 1 * 60 * 60;
      const token = jwt.sign(jwtPayload, JWTSECRET, { expiresIn: jwtExpiresInSeconds });

      const refreshTokenExpiresInSeconds = 7 * 24 * 60 * 60;
      const newRefreshToken = crypto.randomBytes(32).toString('hex');

      const newRefreshTokenDocument = {
          userId: user._id,
          token: newRefreshToken,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds * 1000)
      };
      await refreshTokensCollection.insertOne(newRefreshTokenDocument);

      const accessTokenCookieOptions = {
        httpOnly: true,
        path: '/',
        maxAge: jwtExpiresInSeconds * 1000,
        sameSite: 'Lax',
      };

       const refreshTokenCookieOptions = {
        httpOnly: true,
        path: '/login/refresh',
        maxAge: refreshTokenExpiresInSeconds * 1000,
        sameSite: 'Lax',
      };


      res.cookie('token', token, accessTokenCookieOptions);
      res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);


      res.status(200).json({ message: 'Tokens refreshed successfully.' });

  } catch (error) {
      console.error('Error in refreshToken:', error);
      res.status(500).json({ message: 'Internal server error during token refresh.' });
  }
};
export const verifyJWT = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Access token not provided.' });
    }

    jwt.verify(token, JWTSECRET, (err, decoded) => {
        if (err) {
            
            return res.status(401).json({ message: 'Invalid or expired access token.' });
        }

        
        req.user = decoded;
        next();
    });
};

export const logoutUser = async (req, res) => {
  try {
      const db = getDatabase();
      const refreshTokensCollection = db.collection(REFRESHTOKENSCOLLECTION);

      const { refreshToken } = req.cookies;

      if (!refreshToken) {
          res.clearCookie('token', { path: '/' });
          res.clearCookie('refreshToken', { path: '/login/refresh' });
          return res.status(200).json({ message: 'Logout successful (no token found).' });
      }

      const deleteResult = await refreshTokensCollection.deleteOne({ token: refreshToken });

      if (deleteResult.deletedCount === 0) {
           console.warn('Attempted to log out with refresh token not found in DB:', refreshToken);
      } else {
           console.log('Refresh token successfully deleted from DB.');
      }

      res.clearCookie('token', { path: '/' });
      res.clearCookie('refreshToken', { path: '/login/refresh' });

      res.status(200).json({ message: 'Logout successful.' });

  } catch (error) {
      console.error('Error in logoutUser:', error);
      res.status(500).json({ message: 'Internal server error during logout.' });
  }
};
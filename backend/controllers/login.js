
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
    // The request method is now POST

    // --- Read identifier and password from req.body ---
    const { identifier, password } = req.body;
    // ---------------------------------------------------

    if (!identifier || !password) {
       return res.status(400).json({ message: 'Missing required fields (identifier, password) in request body.' });
    }
    // ... rest of the logic (finding user, comparing password, generating tokens) ...

    const db = getDatabase(); // Ensure these are correctly scoped/available
    const usersCollection = db.collection(USERSCOLLECTION);
    const refreshTokensCollection = db.collection(REFRESHTOKENSCOLLECTION); // Ensure this variable is defined

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

    // ... JWT and Refresh Token generation ...
    const payload = {
      userId: user._id,
      username: user.username
    };

    // Make sure JWTSECRET is accessible in this scope
    if (!process.env.JWTSECRET) { // Check process.env.JWTSECRET directly
        console.error("JWTSECRET environment variable is not set.");
        return res.status(500).json({ message: 'Server configuration error: JWT secret not set.' });
    }
     const JWTSECRET = process.env.JWTSECRET; // Ensure JWTSECRET is defined in this scope

    const token = jwt.sign(payload, JWTSECRET, { expiresIn: 3600 }); // MaxAge 1 hour = 3600 seconds

    const cookieOptions = {
        httpOnly: true,
        maxAge: 3600 * 1000, // Max-Age in milliseconds (1 hour)
        // Add Secure=true if using HTTPS
        // Add SameSite=Lax (or Strict) for better security
        // secure: process.env.NODE_ENV === 'production', // Only set secure in production with HTTPS
        // sameSite: 'Lax' // Or 'Strict'
    };
    res.cookie('token', token, cookieOptions); // Set the token cookie

    const refreshTokenExpiresInSeconds = 604800; // 7 days
    const refreshToken = crypto.randomBytes(32).toString('hex');

    const refreshTokenDocument = {
        userId: user._id,
        token: refreshToken,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds * 1000)
    };

    // Ensure refreshTokensCollection is a valid collection reference
     if (!refreshTokensCollection) {
         console.error("MongoDB refresh tokens collection reference is not valid.");
          return res.status(500).json({ message: 'Server configuration error (refresh tokens collection).' });
    }

    // Delete old tokens for this user and insert the new one
    await refreshTokensCollection.deleteMany({ userId: user._id }); // Consider deleting only expired or all for this user
    await refreshTokensCollection.insertOne(refreshTokenDocument);

    const refreshTokenCookieOptions = {
      httpOnly: true,
      maxAge: refreshTokenExpiresInSeconds * 1000, // Max-Age in milliseconds (7 days)
      // secure: process.env.NODE_ENV === 'production', // Only set secure in production with HTTPS
      // sameSite: 'Lax' // Or 'Strict'
    };

    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions); // Set the refresh token cookie

    // Send success response (do not send token in body if using HttpOnly cookies)
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
      const token = jwt.sign(jwtPayload, JWTSECRET, { expiresIn: 3600 });

      const refreshTokenExpiresInSeconds = 604800;
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
        maxAge: 3600000,
      };

       const refreshTokenCookieOptions = {
        httpOnly: true,
        maxAge: 604800 * 1000,
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
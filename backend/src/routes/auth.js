const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');
const bip39 = require('bip39');
const HDKey = require('hdkey');
const { ethers } = require('ethers');

const router = express.Router();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// Middleware to verify Firebase token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Generate wallet for user
const generateWallet = () => {
  const mnemonic = bip39.generateMnemonic(256); // 24 words
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  const path = "m/44'/60'/0'/0/0"; // Ethereum derivation path
  const childKey = hdkey.derive(path);
  
  const privateKey = childKey.privateKey.toString('hex');
  const address = ethers.computeAddress(privateKey);

  return {
    address,
    privateKey,
    mnemonic
  };
};

// Encrypt wallet info
const encryptWalletInfo = (walletInfo, encryptionKey) => {
  const jsonString = JSON.stringify(walletInfo);
  return CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
};

// Decrypt wallet info
const decryptWalletInfo = (encryptedData, encryptionKey) => {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
  return JSON.parse(jsonString);
};

// Create user account with wallet
router.post('/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if Firebase is available
    if (!admin.apps.length) {
      return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please set up Firebase credentials.' });
    }

    // Check if user already exists
    const existingUser = await admin.auth().getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create Firebase user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Generate wallet for the user
    const walletInfo = generateWallet();
    const encryptionKey = process.env.ENCRYPTION_SECRET || 'default-key';
    const encryptedWallet = encryptWalletInfo(walletInfo, encryptionKey);

    // Create user profile in Firestore
    if (db) {
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: name,
        email: email,
        walletAddress: walletInfo.address,
        encryptedWallet: encryptedWallet,
        registrationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        provider: 'email'
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: name,
        walletAddress: walletInfo.address
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database service temporarily unavailable. Please set up Firebase credentials.' });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    
    // Don't send encrypted wallet data
    const { encryptedWallet, ...safeUserData } = userData;
    
    res.json({
      user: safeUserData
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (name) {
      updateData.name = name;
    }

    await db.collection('users').doc(req.user.uid).update(updateData);

    res.json({
      message: 'Profile updated successfully',
      updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get wallet info (for blockchain operations)
router.get('/wallet', authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    const encryptionKey = process.env.ENCRYPTION_SECRET || 'default-key';
    const walletInfo = decryptWalletInfo(userData.encryptedWallet, encryptionKey);

    res.json({
      walletAddress: walletInfo.address,
      // Don't send private key in response for security
    });

  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    // Delete user from Firebase Auth
    await admin.auth().deleteUser(req.user.uid);
    
    // Delete user data from Firestore
    await db.collection('users').doc(req.user.uid).delete();
    
    // Delete user's files (optional - you might want to keep them for audit)
    const filesSnapshot = await db.collection('files').where('userId', '==', req.user.uid).get();
    const batch = db.batch();
    filesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router; 
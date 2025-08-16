const express = require('express');
const { ethers } = require('ethers');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');

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

// Contract ABI - simplified for the MVP
const CONTRACT_ABI = [
  "function submitHash(bytes32 hash) public",
  "function verifyHash(bytes32 hash) public view returns (bool, address, uint256)",
  "event HashSubmitted(bytes32 indexed hash, address indexed submitter, uint256 timestamp)"
];

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL || 'https://polygon-mumbai.g.alchemy.com/v2/your-key');

// Only initialize contract if address is provided
let contract = null;
const contractAddress = process.env.CONTRACT_ADDRESS;
if (contractAddress && contractAddress.trim() !== '') {
  try {
    contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABI,
      provider
    );
  } catch (error) {
    console.warn('Failed to initialize contract:', error.message);
  }
} else {
  console.warn('Contract address not configured. Blockchain features will be disabled.');
}

// Generate SHA-256 hash of file
const generateFileHash = async (buffer) => {
  const uint8Array = new Uint8Array(buffer);
  const hash = ethers.sha256(uint8Array);
  return hash;
};

// Submit hash to blockchain
const submitHashToBlockchain = async (hash, privateKey) => {
  if (!contract) {
    throw new Error('Contract not configured. Please set CONTRACT_ADDRESS in your environment variables.');
  }
  
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.submitHash(hash);
    const receipt = await tx.wait();
    
    return receipt.hash;
  } catch (error) {
    console.error('Blockchain submission error:', error);
    throw new Error('Failed to submit hash to blockchain');
  }
};

// Verify hash on blockchain
const verifyHashOnBlockchain = async (hash) => {
  if (!contract) {
    console.warn('Contract not configured. Returning mock verification result.');
    return {
      exists: false,
      submitter: '',
      timestamp: 0
    };
  }
  
  try {
    const result = await contract.verifyHash(hash);
    return {
      exists: result[0],
      submitter: result[1],
      timestamp: Number(result[2])
    };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    return {
      exists: false,
      submitter: '',
      timestamp: 0
    };
  }
};

// Get transaction URL for explorer
const getTransactionUrl = (txHash) => {
  const network = process.env.NETWORK || 'mumbai';
  if (network === 'mumbai') {
    return `https://mumbai.polygonscan.com/tx/${txHash}`;
  } else if (network === 'sepolia') {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  return `https://etherscan.io/tx/${txHash}`;
};

// Public verification endpoint (no auth required)
router.post('/verify', [
  body('hash').isLength({ min: 64, max: 64 }).withMessage('Hash must be 64 characters long'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hash } = req.body;

    // Verify on blockchain
    const blockchainResult = await verifyHashOnBlockchain(hash);

    // Also check in our database for additional metadata
    const fileDoc = await db.collection('files')
      .where('fileHash', '==', hash)
      .limit(1)
      .get();

    let fileMetadata = null;
    if (!fileDoc.empty) {
      const fileData = fileDoc.docs[0].data();
      fileMetadata = {
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileType: fileData.fileType,
        uploadTime: fileData.uploadTime,
        userId: fileData.userId
      };
    }

    res.json({
      success: true,
      verification: {
        hash: hash,
        exists: blockchainResult.exists,
        submitter: blockchainResult.submitter,
        timestamp: blockchainResult.timestamp,
        transactionUrl: blockchainResult.exists ? getTransactionUrl(hash) : null,
        fileMetadata: fileMetadata
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Failed to verify hash',
      details: error.message
    });
  }
});

// Submit file for verification (requires auth)
router.post('/submit/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file from database
    const fileDoc = await db.collection('files').doc(fileId).get();
    
    if (!fileDoc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = fileDoc.data();

    // Check if user owns the file
    if (fileData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already verified
    if (fileData.verificationStatus === 'verified') {
      return res.status(400).json({ error: 'File already verified' });
    }

    // Get user's wallet info
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();

    // Decrypt wallet info
    const CryptoJS = require('crypto-js');
    const encryptionKey = process.env.ENCRYPTION_SECRET || 'default-key';
    const decrypted = CryptoJS.AES.decrypt(userData.encryptedWallet, encryptionKey);
    const walletInfo = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

    // Submit to blockchain
    let transactionHash = '';
    try {
      transactionHash = await submitHashToBlockchain(fileData.fileHash, walletInfo.privateKey);
    } catch (error) {
      console.error('Blockchain submission failed:', error);
      
      // Update file status to failed
      await db.collection('files').doc(fileId).update({
        verificationStatus: 'failed',
        updatedAt: new Date().toISOString()
      });

      return res.status(500).json({
        error: 'Blockchain submission failed',
        details: error.message
      });
    }

    // Update file record
    await db.collection('files').doc(fileId).update({
      verificationStatus: 'verified',
      transactionHash: transactionHash,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'File submitted for verification successfully',
      transactionHash: transactionHash,
      transactionUrl: getTransactionUrl(transactionHash)
    });

  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      error: 'Failed to submit for verification',
      details: error.message
    });
  }
});

// Get verification status for user's files
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let query = db.collection('files')
      .where('userId', '==', req.user.uid)
      .orderBy('uploadTime', 'desc');

    if (status) {
      query = query.where('verificationStatus', '==', status);
    }

    const snapshot = await query.limit(parseInt(limit)).offset((parseInt(page) - 1) * parseInt(limit)).get();
    
    const files = [];
    snapshot.forEach(doc => {
      const fileData = doc.data();
      files.push({
        id: doc.id,
        fileName: fileData.fileName,
        fileHash: fileData.fileHash,
        verificationStatus: fileData.verificationStatus,
        transactionHash: fileData.transactionHash,
        transactionUrl: fileData.transactionHash ? getTransactionUrl(fileData.transactionHash) : null,
        uploadTime: fileData.uploadTime,
        verifiedAt: fileData.verifiedAt
      });
    });

    res.json({
      success: true,
      files: files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: files.length
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      error: 'Failed to fetch verification status',
      details: error.message
    });
  }
});

// Get verification statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total files in database
    const totalFilesSnapshot = await db.collection('files').get();
    const totalFiles = totalFilesSnapshot.size;

    // Get verification status counts
    const verifiedSnapshot = await db.collection('files')
      .where('verificationStatus', '==', 'verified')
      .get();
    const verifiedCount = verifiedSnapshot.size;

    const pendingSnapshot = await db.collection('files')
      .where('verificationStatus', '==', 'pending')
      .get();
    const pendingCount = pendingSnapshot.size;

    const failedSnapshot = await db.collection('files')
      .where('verificationStatus', '==', 'failed')
      .get();
    const failedCount = failedSnapshot.size;

    // Get blockchain stats (if contract is available)
    let blockchainStats = null;
    try {
      const totalHashes = await contract.getTotalHashes();
      blockchainStats = {
        totalHashes: Number(totalHashes)
      };
    } catch (error) {
      console.error('Failed to get blockchain stats:', error);
    }

    res.json({
      success: true,
      stats: {
        totalFiles: totalFiles,
        verifiedFiles: verifiedCount,
        pendingFiles: pendingCount,
        failedFiles: failedCount,
        verificationRate: totalFiles > 0 ? (verifiedCount / totalFiles) * 100 : 0,
        blockchainStats: blockchainStats
      }
    });

  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch verification statistics',
      details: error.message
    });
  }
});

// Batch verification endpoint
router.post('/verify-batch', [
  body('hashes').isArray().withMessage('Hashes must be an array'),
  body('hashes.*').isLength({ min: 64, max: 64 }).withMessage('Each hash must be 64 characters long'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hashes } = req.body;

    const results = [];
    for (const hash of hashes) {
      try {
        const blockchainResult = await verifyHashOnBlockchain(hash);
        
        // Get file metadata
        const fileDoc = await db.collection('files')
          .where('fileHash', '==', hash)
          .limit(1)
          .get();

        let fileMetadata = null;
        if (!fileDoc.empty) {
          const fileData = fileDoc.docs[0].data();
          fileMetadata = {
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            fileType: fileData.fileType,
            uploadTime: fileData.uploadTime
          };
        }

        results.push({
          hash: hash,
          exists: blockchainResult.exists,
          submitter: blockchainResult.submitter,
          timestamp: blockchainResult.timestamp,
          transactionUrl: blockchainResult.exists ? getTransactionUrl(hash) : null,
          fileMetadata: fileMetadata
        });
      } catch (error) {
        results.push({
          hash: hash,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        verified: results.filter(r => r.exists).length,
        notFound: results.filter(r => !r.exists && !r.error).length,
        errors: results.filter(r => r.error).length
      }
    });

  } catch (error) {
    console.error('Batch verification error:', error);
    res.status(500).json({
      error: 'Failed to verify hashes',
      details: error.message
    });
  }
});

module.exports = router; 
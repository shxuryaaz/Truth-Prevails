const express = require('express');
const multer = require('multer');
const admin = require('firebase-admin');
const { ethers } = require('ethers');
const { body, validationResult } = require('express-validator');
const { upload, deleteFromCloudinary, getSecureUrl } = require('../config/cloudinary');

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

// Generate SHA-256 hash of file
const generateFileHash = async (buffer) => {
  const uint8Array = new Uint8Array(buffer);
  const hash = ethers.sha256(uint8Array);
  return hash;
};

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Check if Firebase is initialized
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // Check if buffer exists
    if (!buffer) {
      return res.status(400).json({ error: 'File buffer is missing' });
    }

    // Generate file hash from the uploaded file buffer
    const fileHash = await generateFileHash(buffer);
    console.log(`Backend: File "${originalname}" has hash: ${fileHash}`);
    console.log(`Backend: File size: ${size} bytes, type: ${mimetype}`);
    console.log(`Backend: Buffer length: ${buffer.length} bytes`);

    // Upload to Cloudinary
    let cloudinaryResult;
    try {
      const cloudinary = require('../config/cloudinary').cloudinary;
      const stream = require('stream');
      
      // Create a readable stream from buffer
      const readableStream = new stream.Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      
      // Upload to Cloudinary
      cloudinaryResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'truth-prevails',
            resource_type: 'auto',
            transformation: [
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        readableStream.pipe(uploadStream);
      });
      
      console.log(`Backend: Uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      return res.status(500).json({ 
        error: 'Failed to upload to Cloudinary',
        details: cloudinaryError.message
      });
    }

    // Check if file already exists
    const existingFile = await db.collection('files')
      .where('fileHash', '==', fileHash)
      .where('userId', '==', req.user.uid)
      .limit(1)
      .get();

    if (!existingFile.empty) {
      const existingFileData = existingFile.docs[0].data();
      console.log(`Backend: Found existing file with same hash: "${existingFileData.fileName}" (ID: ${existingFile.docs[0].id})`);
      console.log(`Backend: Existing file hash: ${existingFileData.fileHash}`);
      console.log(`Backend: New file hash: ${fileHash}`);
      console.log(`Backend: Hashes match: ${existingFileData.fileHash === fileHash}`);
      return res.status(409).json({ 
        error: 'File already exists',
        fileId: existingFile.docs[0].id,
        existingFileName: existingFileData.fileName
      });
    }

    // Debug: Let's also check if there are any files with similar hashes
    console.log(`Backend: No exact match found. Checking for similar hashes...`);
    const allUserFiles = await db.collection('files')
      .where('userId', '==', req.user.uid)
      .get();
    
    console.log(`Backend: User has ${allUserFiles.size} total files`);
    allUserFiles.forEach(doc => {
      const fileData = doc.data();
      console.log(`Backend: File "${fileData.fileName}" - Hash: ${fileData.fileHash}`);
    });

    // Get user's wallet info
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();

    // Create file record in Firestore
    const fileRecord = {
      userId: req.user.uid,
      fileName: originalname,
      fileHash: fileHash,
      fileSize: size,
      fileType: mimetype,
      uploadTime: new Date().toISOString(),
      downloadURL: cloudinaryResult.secure_url, // Cloudinary URL
      publicId: cloudinaryResult.public_id, // Cloudinary public ID
      walletAddress: userData?.walletAddress || 'unknown',
      verificationStatus: 'pending',
      storagePath: `cloudinary:${cloudinaryResult.public_id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('files').add(fileRecord);

    res.status(201).json({
      success: true,
      fileId: docRef.id,
      file: {
        ...fileRecord,
        id: docRef.id
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      details: error.message
    });
  }
});

// Get user's files
router.get('/my-files', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db.collection('files')
      .where('userId', '==', req.user.uid)
      .orderBy('uploadTime', 'desc');

    if (status) {
      query = query.where('verificationStatus', '==', status);
    }

    const snapshot = await query.limit(parseInt(limit)).offset(parseInt(offset)).get();
    
    const files = [];
    snapshot.forEach(doc => {
      files.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Get total count
    const totalSnapshot = await db.collection('files')
      .where('userId', '==', req.user.uid)
      .get();

    res.json({
      success: true,
      files: files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalSnapshot.size,
        pages: Math.ceil(totalSnapshot.size / limit)
      }
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      details: error.message
    });
  }
});

// Get file by ID
router.get('/:fileId', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const { fileId } = req.params;

    const doc = await db.collection('files').doc(fileId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = doc.data();

    // Check if user owns the file
    if (fileData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      file: {
        id: doc.id,
        ...fileData
      }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      error: 'Failed to fetch file',
      details: error.message
    });
  }
});

// Update file metadata
router.put('/:fileId', authenticateToken, [
  body('fileName').optional().trim().isLength({ min: 1 }).withMessage('File name cannot be empty'),
], async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fileId } = req.params;
    const { fileName } = req.body;

    const doc = await db.collection('files').doc(fileId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = doc.data();

    // Check if user owns the file
    if (fileData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (fileName) {
      updateData.fileName = fileName;
    }

    await db.collection('files').doc(fileId).update(updateData);

    res.json({
      success: true,
      message: 'File updated successfully',
      updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      error: 'Failed to update file',
      details: error.message
    });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const { fileId } = req.params;

    const doc = await db.collection('files').doc(fileId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = doc.data();

    // Check if user owns the file
    if (fileData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from Cloudinary
    if (fileData.publicId) {
      try {
        await deleteFromCloudinary(fileData.publicId);
      } catch (cloudinaryError) {
        console.warn('Failed to delete from Cloudinary:', cloudinaryError.message);
      }
    }

    // Delete from Firestore
    await db.collection('files').doc(fileId).delete();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

// Get file download URL
router.get('/:fileId/download', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const { fileId } = req.params;

    const doc = await db.collection('files').doc(fileId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = doc.data();

    // Check if user owns the file
    if (fileData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate secure download URL from Cloudinary
    const downloadUrl = fileData.publicId ? getSecureUrl(fileData.publicId) : fileData.downloadURL;

    res.json({
      success: true,
      downloadUrl: downloadUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    });

  } catch (error) {
    console.error('Get download URL error:', error);
    res.status(500).json({
      error: 'Failed to generate download URL',
      details: error.message
    });
  }
});

// Get file statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase not configured',
        details: 'Please configure Firebase Admin SDK environment variables'
      });
    }

    const filesSnapshot = await db.collection('files')
      .where('userId', '==', req.user.uid)
      .get();

    const stats = {
      totalFiles: filesSnapshot.size,
      totalSize: 0,
      byType: {},
      byStatus: {
        pending: 0,
        verified: 0,
        failed: 0
      },
      recentUploads: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    filesSnapshot.forEach(doc => {
      const fileData = doc.data();
      
      // Calculate total size
      stats.totalSize += fileData.fileSize || 0;

      // Count by type
      const fileType = fileData.fileType || 'unknown';
      stats.byType[fileType] = (stats.byType[fileType] || 0) + 1;

      // Count by status
      const status = fileData.verificationStatus || 'pending';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count recent uploads
      if (new Date(fileData.uploadTime) > oneWeekAgo) {
        stats.recentUploads++;
      }
    });

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

module.exports = router; 
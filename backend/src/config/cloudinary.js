const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Custom storage that preserves buffer and uploads to Cloudinary
const storage = multer.memoryStorage();

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/avi',
      'video/mov',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Helper function to upload file with custom folder structure
const uploadToCloudinary = async (file, userId, fileHash) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `truth-prevails/users/${userId}/${fileHash}`,
      public_id: file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension for public_id
      resource_type: 'auto',
      overwrite: false,
      invalidate: true
    });
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Helper function to get secure URL
const getSecureUrl = (publicId) => {
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: 'upload'
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  getSecureUrl
}; 
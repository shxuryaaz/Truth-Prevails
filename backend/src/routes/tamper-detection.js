const express = require('express');
const multer = require('multer');
const exifr = require('exifr');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
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

// Analyze image metadata for tampering
const analyzeImageMetadata = async (buffer, filename) => {
  try {
    const exifData = await exifr.parse(buffer);
    
    if (!exifData) {
      return {
        status: 'suspicious',
        details: 'No EXIF metadata found - file may have been stripped of metadata',
        confidence: 0.7
      };
    }

    const analysis = {
      status: 'clean',
      details: 'Image appears to be authentic',
      confidence: 0.9,
      metadata: {}
    };

    // Check for common tampering indicators
    const suspiciousIndicators = [];

    // Check if software field indicates editing
    if (exifData.Software) {
      const editingSoftware = ['photoshop', 'gimp', 'paint', 'canva', 'figma'];
      const software = exifData.Software.toLowerCase();
      
      if (editingSoftware.some(editor => software.includes(editor))) {
        suspiciousIndicators.push('File was edited with image editing software');
        analysis.confidence -= 0.2;
      }
    }

    // Check for missing or inconsistent timestamps
    if (!exifData.DateTimeOriginal && !exifData.CreateDate) {
      suspiciousIndicators.push('Missing original creation timestamp');
      analysis.confidence -= 0.3;
    }

    // Check for multiple timestamps that don't make sense
    if (exifData.DateTimeOriginal && exifData.ModifyDate) {
      const original = new Date(exifData.DateTimeOriginal);
      const modified = new Date(exifData.ModifyDate);
      
      if (modified < original) {
        suspiciousIndicators.push('Modification date is before creation date');
        analysis.confidence -= 0.4;
      }
    }

    // Check GPS data consistency
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      // Basic GPS validation
      const lat = exifData.GPSLatitude;
      const lng = exifData.GPSLongitude;
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        suspiciousIndicators.push('Invalid GPS coordinates');
        analysis.confidence -= 0.3;
      }
    }

    // Update status based on confidence
    if (analysis.confidence < 0.6) {
      analysis.status = 'suspicious';
      analysis.details = `Suspicious indicators found: ${suspiciousIndicators.join(', ')}`;
    } else if (analysis.confidence < 0.8) {
      analysis.status = 'suspicious';
      analysis.details = 'Some suspicious indicators detected';
    }

    // Store relevant metadata
    analysis.metadata = {
      software: exifData.Software,
      make: exifData.Make,
      model: exifData.Model,
      dateTimeOriginal: exifData.DateTimeOriginal,
      modifyDate: exifData.ModifyDate,
      gpsLatitude: exifData.GPSLatitude,
      gpsLongitude: exifData.GPSLongitude,
      imageWidth: exifData.ImageWidth,
      imageHeight: exifData.ImageHeight
    };

    return analysis;

  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      status: 'failed',
      details: 'Failed to analyze image metadata',
      confidence: 0.0
    };
  }
};

// Analyze PDF metadata
const analyzePDFMetadata = async (buffer, filename) => {
  try {
    // Basic PDF analysis - in a real implementation, you'd use a PDF parsing library
    const pdfHeader = buffer.toString('ascii', 0, 8);
    
    if (!pdfHeader.startsWith('%PDF-')) {
      return {
        status: 'suspicious',
        details: 'Invalid PDF format',
        confidence: 0.0
      };
    }

    // Check for common PDF editing indicators
    const pdfContent = buffer.toString('ascii', 0, 1000);
    const suspiciousTerms = [
      '/Creator',
      '/Producer',
      '/ModDate',
      '/CreationDate',
      'Adobe',
      'Acrobat',
      'PDF-XChange',
      'Foxit'
    ];

    const foundTerms = suspiciousTerms.filter(term => pdfContent.includes(term));
    
    const analysis = {
      status: 'clean',
      details: 'PDF appears to be authentic',
      confidence: 0.8,
      metadata: {
        creator: null,
        producer: null,
        creationDate: null,
        modifyDate: null
      }
    };

    if (foundTerms.length > 0) {
      analysis.details = `PDF contains editing software indicators: ${foundTerms.join(', ')}`;
      analysis.confidence = Math.max(0.5, 0.8 - (foundTerms.length * 0.1));
    }

    return analysis;

  } catch (error) {
    console.error('PDF analysis error:', error);
    return {
      status: 'failed',
      details: 'Failed to analyze PDF metadata',
      confidence: 0.0
    };
  }
};

// Analyze document metadata
const analyzeDocumentMetadata = async (buffer, filename, mimeType) => {
  try {
    // Basic document analysis
    const analysis = {
      status: 'clean',
      details: 'Document appears to be authentic',
      confidence: 0.7,
      metadata: {
        fileType: mimeType,
        fileName: filename,
        fileSize: buffer.length
      }
    };

    // Check file size for suspicious patterns
    if (buffer.length < 100) {
      analysis.status = 'suspicious';
      analysis.details = 'File size is unusually small';
      analysis.confidence = 0.3;
    }

    // Check for common document editing indicators
    const content = buffer.toString('ascii', 0, 2000);
    const suspiciousPatterns = [
      'Microsoft Word',
      'Google Docs',
      'LibreOffice',
      'OpenOffice',
      'WPS Office'
    ];

    const foundPatterns = suspiciousPatterns.filter(pattern => 
      content.toLowerCase().includes(pattern.toLowerCase())
    );

    if (foundPatterns.length > 0) {
      analysis.details = `Document was created with: ${foundPatterns.join(', ')}`;
      analysis.confidence = Math.max(0.5, 0.7 - (foundPatterns.length * 0.1));
    }

    return analysis;

  } catch (error) {
    console.error('Document analysis error:', error);
    return {
      status: 'failed',
      details: 'Failed to analyze document metadata',
      confidence: 0.0
    };
  }
};

// Main tamper detection endpoint
router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { buffer, originalname, mimetype } = req.file;
    let analysis;

    // Route to appropriate analysis based on file type
    if (mimetype.startsWith('image/')) {
      analysis = await analyzeImageMetadata(buffer, originalname);
    } else if (mimetype === 'application/pdf') {
      analysis = await analyzePDFMetadata(buffer, originalname);
    } else {
      analysis = await analyzeDocumentMetadata(buffer, originalname, mimetype);
    }

    // Add file information to analysis
    analysis.fileInfo = {
      name: originalname,
      type: mimetype,
      size: buffer.length,
      analyzedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Tamper detection error:', error);
    res.status(500).json({
      error: 'Failed to analyze file',
      details: error.message
    });
  }
});

// Batch analysis endpoint
router.post('/analyze-batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const analyses = [];

    for (const file of req.files) {
      const { buffer, originalname, mimetype } = file;
      let analysis;

      if (mimetype.startsWith('image/')) {
        analysis = await analyzeImageMetadata(buffer, originalname);
      } else if (mimetype === 'application/pdf') {
        analysis = await analyzePDFMetadata(buffer, originalname);
      } else {
        analysis = await analyzeDocumentMetadata(buffer, originalname, mimetype);
      }

      analysis.fileInfo = {
        name: originalname,
        type: mimetype,
        size: buffer.length,
        analyzedAt: new Date().toISOString()
      };

      analyses.push(analysis);
    }

    // Calculate overall confidence
    const overallConfidence = analyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / analyses.length;
    const suspiciousCount = analyses.filter(a => a.status === 'suspicious').length;
    const failedCount = analyses.filter(a => a.status === 'failed').length;

    res.json({
      success: true,
      analyses: analyses,
      summary: {
        totalFiles: analyses.length,
        overallConfidence: overallConfidence,
        suspiciousFiles: suspiciousCount,
        failedAnalyses: failedCount,
        cleanFiles: analyses.length - suspiciousCount - failedCount
      }
    });

  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze files',
      details: error.message
    });
  }
});

// Get analysis statistics
router.get('/stats', async (req, res) => {
  try {
    // In a real implementation, you'd query your database for statistics
    const stats = {
      totalAnalyses: 0,
      cleanFiles: 0,
      suspiciousFiles: 0,
      failedAnalyses: 0,
      averageConfidence: 0.0,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

module.exports = router; 
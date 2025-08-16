// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify`,
  },
  
  // File endpoints
  FILES: {
    UPLOAD: `${API_BASE_URL}/api/files/upload`,
    MY_FILES: `${API_BASE_URL}/api/files/my-files`,
    GET_FILE: (fileId: string) => `${API_BASE_URL}/api/files/${fileId}`,
    UPDATE_FILE: (fileId: string) => `${API_BASE_URL}/api/files/${fileId}`,
    DELETE_FILE: (fileId: string) => `${API_BASE_URL}/api/files/${fileId}`,
    DOWNLOAD_FILE: (fileId: string) => `${API_BASE_URL}/api/files/${fileId}/download`,
    STATS: `${API_BASE_URL}/api/files/stats/overview`,
  },
  
  // Verification endpoints
  VERIFICATION: {
    VERIFY_HASH: `${API_BASE_URL}/api/verification/verify`,
    VERIFY_FILE: `${API_BASE_URL}/api/verification/verify-file`,
  },
  
  // Tamper detection endpoints
  TAMPER_DETECTION: {
    ANALYZE: `${API_BASE_URL}/api/tamper-detection/analyze`,
  },
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`,
};

// Environment configuration
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// File upload configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'video/*': ['.mp4', '.avi', '.mov'],
    'audio/*': ['.mp3', '.wav', '.m4a']
  }
}; 
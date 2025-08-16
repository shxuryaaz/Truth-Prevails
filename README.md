# Truth Prevails - Digital Evidence Verification Platform

A secure platform that allows users to upload digital evidence (images, audio, video, documents) and receive tamper-proof certificates of authenticity using blockchain verification and AI-based forgery detection.

## 🚀 Features

### Core Functionality
- **File Upload & Hashing**: Upload various file types and generate SHA-256 hashes
- **Blockchain Verification**: Store file hashes on Polygon Mumbai/Ethereum Sepolia
- **Auto-Wallet Creation**: BIP-39 wallet generation for each user
- **AI Tamper Detection**: Analyze file metadata for potential tampering
- **Public Verification**: Verify any file without login requirements
- **PDF Certificates**: Generate professional certificates with QR codes

### Security Features
- Client-side file hashing before upload
- Encrypted wallet storage (AES-256)
- Input sanitization and validation
- Rate limiting and security headers
- Firebase Authentication integration

### Supported File Types
- **Images**: JPG, PNG, GIF
- **Documents**: PDF, DOC, DOCX
- **Videos**: MP4, AVI, MOV
- **Audio**: MP3, WAV, M4A

## 🏗️ Architecture

```
truth-prevails/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utilities and services
│   └── public/              # Static assets
├── backend/                 # Express.js backend server
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   └── index.js         # Main server file
│   └── package.json
├── contracts/               # Solidity smart contracts
│   └── TruthProof.sol       # Main verification contract
└── shared/                  # Shared utilities
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **Framer Motion** for animations
- **Firebase** for authentication and storage
- **ethers.js** for blockchain interaction

### Backend
- **Express.js** with TypeScript
- **Firebase Admin SDK** for server-side operations
- **Multer** for file uploads
- **exifr** for metadata extraction
- **ethers.js** for blockchain operations

### Blockchain
- **Solidity** smart contracts
- **Polygon Mumbai** testnet (or Ethereum Sepolia)
- **Alchemy** for RPC endpoints

### Infrastructure
- **Firebase** for authentication, Firestore, and storage
- **Vercel** for frontend deployment
- **Render/Firebase Functions** for backend deployment

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Firebase CLI** (optional, for deployment)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/truth-prevails.git
cd truth-prevails
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install

# Install contract dependencies
cd ../contracts && npm install
```

### 3. Environment Setup

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Set up Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Get your Firebase config and service account key

3. Set up Blockchain:
   - Create an Alchemy account and get your API key
   - Deploy the smart contract to Polygon Mumbai or Ethereum Sepolia
   - Get the contract address

4. Update your `.env` file with all the required values

### 4. Deploy Smart Contract

```bash
cd contracts

# Install Hardhat (if not already installed)
npm install -g hardhat

# Deploy the contract
npx hardhat run scripts/deploy.js --network mumbai
```

### 5. Start Development Servers

```bash
# Start both frontend and backend (from root directory)
npm run dev

# Or start them separately:
# Frontend (port 3000)
cd frontend && npm run dev

# Backend (port 3001)
cd backend && npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📖 API Documentation

### Authentication Endpoints

```
POST /api/auth/signup          # Create new user account
GET  /api/auth/profile         # Get user profile
PUT  /api/auth/profile         # Update user profile
GET  /api/auth/wallet          # Get wallet info
DELETE /api/auth/account       # Delete user account
```

### File Management Endpoints

```
POST /api/files/upload         # Upload file
GET  /api/files/my-files       # Get user's files
GET  /api/files/:fileId        # Get specific file
PUT  /api/files/:fileId        # Update file metadata
DELETE /api/files/:fileId      # Delete file
GET  /api/files/:fileId/download # Get download URL
GET  /api/files/stats/overview # Get file statistics
```

### Verification Endpoints

```
POST /api/verification/verify  # Verify file hash (public)
POST /api/verification/submit/:fileId # Submit file for verification
GET  /api/verification/status  # Get verification status
GET  /api/verification/stats   # Get verification statistics
POST /api/verification/verify-batch # Batch verification
```

### Tamper Detection Endpoints

```
POST /api/tamper-detection/analyze    # Analyze single file
POST /api/tamper-detection/analyze-batch # Analyze multiple files
GET  /api/tamper-detection/stats      # Get analysis statistics
```

## 🔧 Configuration

### Firebase Setup

1. **Authentication**:
   - Enable Email/Password authentication
   - Configure sign-in methods

2. **Firestore Database**:
   - Create database in test mode
   - Set up security rules

3. **Storage**:
   - Create storage bucket
   - Configure security rules

4. **Service Account**:
   - Generate new private key
   - Download JSON file
   - Add to environment variables

### Blockchain Setup

1. **Network Selection**:
   - Polygon Mumbai (recommended for testing)
   - Ethereum Sepolia (alternative)

2. **Contract Deployment**:
   - Deploy `TruthProof.sol` contract
   - Verify contract on block explorer
   - Update contract address in environment

3. **RPC Configuration**:
   - Get Alchemy API key
   - Configure RPC URL in environment

## 🚀 Deployment

### Frontend Deployment (Vercel)

1. **Connect Repository**:
   - Push code to GitHub
   - Connect repository to Vercel

2. **Configure Environment**:
   - Add all `NEXT_PUBLIC_*` environment variables
   - Set build command: `npm run build`
   - Set output directory: `.next`

3. **Deploy**:
   - Vercel will automatically deploy on push
   - Custom domain can be configured

### Backend Deployment (Render)

1. **Create Service**:
   - Connect GitHub repository
   - Select Node.js environment

2. **Configure Build**:
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm start`

3. **Environment Variables**:
   - Add all backend environment variables
   - Set `NODE_ENV=production`

### Smart Contract Deployment

1. **Verify Contract**:
   ```bash
   npx hardhat verify --network mumbai CONTRACT_ADDRESS
   ```

2. **Update Frontend**:
   - Update contract address in environment
   - Redeploy frontend

## 🔒 Security Considerations

### File Security
- Files are hashed client-side before upload
- Only hashes are sent to blockchain
- Files stored temporarily in Firebase Storage
- Access controlled by Firebase security rules

### Wallet Security
- Private keys encrypted with AES-256
- Keys never transmitted to frontend
- Wallet operations handled server-side
- BIP-39 mnemonic generation for recovery

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- Firebase token verification

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run test
```

### Backend Testing
```bash
cd backend
npm test
```

### Smart Contract Testing
```bash
cd contracts
npx hardhat test
```

## 📊 Monitoring & Analytics

### Health Checks
- Backend health endpoint: `/health`
- Database connectivity monitoring
- Blockchain connection status

### Logging
- Structured logging with Morgan
- Error tracking and monitoring
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## 🔮 Roadmap

### Phase 2 Features
- [ ] Advanced AI tamper detection
- [ ] Batch file processing
- [ ] API rate limiting tiers
- [ ] Webhook notifications
- [ ] Mobile app development

### Phase 3 Features
- [ ] Multi-chain support
- [ ] Advanced analytics dashboard
- [ ] Enterprise features
- [ ] White-label solutions

---

**Built with ❤️ by the Truth Prevails Team** 
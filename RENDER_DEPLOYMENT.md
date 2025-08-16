# Render Deployment Guide for Truth-Prevails Backend

## Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done)
2. **Make sure your backend folder structure is correct:**
   ```
   backend/
   ├── package.json
   ├── src/
   │   ├── index.js
   │   ├── config/
   │   └── routes/
   └── .env (create this locally for testing)
   ```

## Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Verify your email address

## Step 3: Deploy Backend Service

1. **Click "New +" → "Web Service"**
2. **Connect your GitHub repository**
3. **Configure the service:**

   **Basic Settings:**
   - **Name:** `truth-prevails-backend`
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `backend` (important!)

   **Build & Deploy Settings:**
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

   **Environment Variables:**
   Add these variables in Render dashboard:

   ```
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   
   # Blockchain Configuration
   CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
   ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key
   NETWORK=sepolia
   ENCRYPTION_SECRET=your_aes_encryption_secret_key_here
   
   # Cloudinary Configuration (if using)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Click "Create Web Service"**

## Step 4: Wait for Deployment

1. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Start your application
   - Provide a URL (e.g., `https://truth-prevails-backend.onrender.com`)

2. **Monitor the deployment logs** to ensure everything works

## Step 5: Test Your Deployment

1. **Health Check:** Visit `https://your-app-name.onrender.com/health`
2. **Should return:**
   ```json
   {
     "status": "OK",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "service": "Truth Prevails Backend",
     "version": "1.0.0",
     "storage": "Cloudinary"
   }
   ```

## Step 6: Update Frontend Configuration

1. **Update your frontend environment variables:**
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-app-name.onrender.com
   ```

2. **Deploy frontend to Vercel** (separate guide)

## Important Notes

### Free Tier Limitations:
- **750 hours/month** (about 31 days)
- **Sleeps after 15 minutes** of inactivity
- **512MB RAM**
- **First request after sleep** may take 30-60 seconds

### Environment Variables:
- **Never commit `.env` files** to GitHub
- **Set all variables** in Render dashboard
- **Use production values** for all API keys

### Troubleshooting:
- **Check deployment logs** in Render dashboard
- **Verify environment variables** are set correctly
- **Test locally** with production environment variables

## Next Steps

1. **Deploy frontend to Vercel**
2. **Update CORS settings** if needed
3. **Set up custom domain** (optional)
4. **Monitor performance** and logs

Your backend will be available at: `https://your-app-name.onrender.com`

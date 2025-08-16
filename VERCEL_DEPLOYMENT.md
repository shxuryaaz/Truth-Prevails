# Vercel Frontend Deployment Guide

## Step 1: Prepare Your Frontend

Your frontend is already well-configured for Vercel deployment! ✅

## Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with your GitHub account
4. Verify your email

## Step 3: Deploy to Vercel

### Method 1: GitHub Integration (Recommended)

1. **In Vercel Dashboard:**
   - Click "New Project"
   - Import your GitHub repository: `Truth-Prevails`

2. **Configure Project:**
   ```
   Project Name: truth-prevails-frontend
   Framework Preset: Next.js (auto-detected)
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables:**
   Add these in Vercel dashboard:

   **Required Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://truth-prevails.onrender.com
   
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   
   # Blockchain Configuration
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
   NEXT_PUBLIC_ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key
   NEXT_PUBLIC_NETWORK=sepolia
   NEXT_PUBLIC_ENCRYPTION_SECRET=your_aes_encryption_secret_key_here
   ```

4. **Click "Deploy"**

### Method 2: Vercel CLI (Alternative)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from frontend directory:**
   ```bash
   cd frontend
   vercel
   ```

4. **Follow the prompts:**
   - Link to existing project or create new
   - Set environment variables
   - Deploy

## Step 4: Wait for Deployment

Vercel will automatically:
- Install dependencies
- Build your Next.js app
- Deploy to CDN
- Provide a URL (e.g., `https://truth-prevails-frontend.vercel.app`)

## Step 5: Test Your Deployment

1. **Visit your Vercel URL**
2. **Test the application:**
   - Login/Register functionality
   - File upload
   - Blockchain verification
   - All features should work

## Step 6: Configure Custom Domain (Optional)

1. **In Vercel Dashboard:**
   - Go to your project
   - Click "Settings" → "Domains"
   - Add your custom domain

## Important Configuration Notes

### Environment Variables:
- **All `NEXT_PUBLIC_*` variables** are exposed to the browser
- **Backend URL** should point to your Render deployment
- **Firebase config** should be production values
- **Blockchain config** should be your deployed contract

### Build Configuration:
- **Next.js 14** is supported
- **TypeScript** is supported
- **Tailwind CSS** is supported
- **All your dependencies** are compatible

### Performance:
- **Automatic CDN** distribution
- **Image optimization** enabled
- **Static generation** where possible
- **Edge functions** support

## Troubleshooting

### Build Errors:
1. **Check build logs** in Vercel dashboard
2. **Verify all dependencies** are in package.json
3. **Check TypeScript errors** locally first

### Runtime Errors:
1. **Check browser console** for errors
2. **Verify environment variables** are set
3. **Test API connectivity** to backend

### Common Issues:
- **CORS errors:** Backend CORS should allow Vercel domain
- **API errors:** Check if backend URL is correct
- **Firebase errors:** Verify Firebase config

## Free Tier Benefits

✅ **Unlimited deployments**
✅ **100GB bandwidth/month**
✅ **Always active** (no sleep mode)
✅ **Automatic HTTPS**
✅ **Global CDN**
✅ **Custom domains**

## Your URLs

- **Frontend:** `https://truth-prevails-frontend.vercel.app`
- **Backend:** `https://truth-prevails.onrender.com`

## Next Steps

1. **Test all functionality**
2. **Set up monitoring** (optional)
3. **Configure analytics** (optional)
4. **Set up custom domain** (optional)

Your full-stack application is now deployed! 🚀

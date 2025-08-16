# Netlify Deployment Guide for Truth-Prevails Frontend

## Step 1: Create Netlify Account

1. Go to [netlify.com](https://netlify.com)
2. Click "Sign Up"
3. Sign up with your **GitHub account**
4. Verify your email

## Step 2: Deploy Your Frontend

### Method 1: GitHub Integration (Recommended)

1. **In Netlify Dashboard:**
   - Click "New site from Git"
   - Choose "GitHub"
   - Select your `Truth-Prevails` repository

2. **Configure Build Settings:**
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: .next
   ```

3. **Add Environment Variables:**
   Click "Show advanced" → "New variable" and add:

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

4. **Click "Deploy site"**

### Method 2: Netlify CLI (Alternative)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Deploy from frontend directory:**
   ```bash
   cd frontend
   netlify deploy --prod
   ```

## Step 3: Wait for Deployment

Netlify will automatically:
- ✅ Install dependencies
- ✅ Build your Next.js app
- ✅ Deploy to CDN
- ✅ Provide a URL (e.g., `https://truth-prevails.netlify.app`)

## Step 4: Configure Custom Domain (Optional)

1. **In Netlify Dashboard:**
   - Go to your site
   - Click "Domain settings"
   - Add your custom domain

## Step 5: Test Your Deployment

1. **Visit your Netlify URL**
2. **Test all features:**
   - ✅ Login/Register
   - ✅ File upload
   - ✅ Blockchain verification
   - ✅ Tamper detection

## Important Configuration Notes

### Environment Variables:
- **All `NEXT_PUBLIC_*` variables** are exposed to the browser
- **Backend URL** should point to your Render deployment
- **Firebase config** should be production values
- **Blockchain config** should be your deployed contract

### Build Configuration:
- **Next.js 14** is fully supported
- **TypeScript** is supported
- **Tailwind CSS** is supported
- **All dependencies** are compatible

### Performance:
- **Automatic CDN** distribution
- **Image optimization** enabled
- **Static generation** where possible
- **Edge functions** support

## Troubleshooting

### Build Errors:
1. **Check build logs** in Netlify dashboard
2. **Verify all dependencies** are in package.json
3. **Check TypeScript errors** locally first

### Runtime Errors:
1. **Check browser console** for errors
2. **Verify environment variables** are set
3. **Test API connectivity** to backend

### Common Issues:
- **CORS errors:** Backend CORS should allow Netlify domain
- **API errors:** Check if backend URL is correct
- **Firebase errors:** Verify Firebase config

## Free Tier Benefits

✅ **Unlimited deployments**
✅ **100GB bandwidth/month**
✅ **Always active** (no sleep mode)
✅ **Automatic HTTPS**
✅ **Global CDN**
✅ **Custom domains**
✅ **Form handling**
✅ **Serverless functions**

## Your URLs

- **Frontend:** `https://truth-prevails.netlify.app`
- **Backend:** `https://truth-prevails.onrender.com`

## Next Steps

1. **Test all functionality**
2. **Set up form handling** (if needed)
3. **Configure analytics** (optional)
4. **Set up custom domain** (optional)

Your full-stack application is now deployed on Netlify! 🚀

# Google Sign-In Setup Guide

## Enable Google Sign-In in Firebase Console

### Step 1: Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `truthprevails-a590e`

### Step 2: Enable Google Sign-In
1. In the left sidebar, click **Authentication**
2. Click on the **Sign-in method** tab
3. Find **Google** in the list of providers
4. Click on **Google** to configure it
5. Toggle the **Enable** switch to turn it on
6. Add your **Project support email** (your email address)
7. Click **Save**

### Step 3: Configure OAuth Consent Screen (if needed)
1. If prompted, you may need to configure the OAuth consent screen
2. Go to [Google Cloud Console](https://console.cloud.google.com/)
3. Select your Firebase project
4. Navigate to **APIs & Services** > **OAuth consent screen**
5. Configure the consent screen with your app details
6. Add your domain to authorized domains

### Step 4: Test Google Sign-In
1. Your app now supports Google Sign-In!
2. Users can click "Sign in with Google" on login/signup pages
3. Google will handle the authentication and return user data
4. The app will automatically create a wallet for new Google users

## Features Added

✅ **Google Sign-In Button** on login and signup pages  
✅ **Automatic Wallet Generation** for Google users  
✅ **User Profile Creation** with Google data  
✅ **Seamless Integration** with existing email/password auth  

## How It Works

1. **New Users**: Click "Sign up with Google" → Google auth → Wallet created → Dashboard
2. **Existing Users**: Click "Sign in with Google" → Google auth → Dashboard
3. **Wallet Management**: Same as email users - encrypted storage in Firestore

## Security Notes

- Google handles authentication securely
- User wallets are still encrypted with your encryption secret
- No additional API keys needed
- Works with your existing Firebase configuration 
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  env: {
    // Provide fallback values for missing environment variables
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    NEXT_PUBLIC_ALCHEMY_URL: process.env.NEXT_PUBLIC_ALCHEMY_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'sepolia',
    NEXT_PUBLIC_ENCRYPTION_SECRET: process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'demo_encryption_secret_key_32_chars_long',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Exclude problematic Firebase Storage modules
    config.externals = config.externals || [];
    config.externals.push({
      '@firebase/storage': 'commonjs @firebase/storage',
      'undici': 'commonjs undici'
    });
    
    // Handle module resolution
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  experimental: {
    // Disable static generation for pages with Firebase
    staticPageGenerationTimeout: 0,
  },
}

module.exports = nextConfig 
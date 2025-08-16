'use client';

import { useState, useEffect } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { blockchainService } from '@/lib/blockchain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, Clock, FileText, ExternalLink, Copy, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { formatDate, truncateAddress, copyToClipboard } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface VerificationResult {
  exists: boolean;
  submitter: string;
  timestamp: number;
}

export default function VerifyPage() {
  noStore(); // Disable static generation
  const searchParams = useSearchParams();
  const [hash, setHash] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    const hashParam = searchParams.get('hash');
    if (hashParam) {
      setHash(hashParam);
      handleVerify(hashParam);
    }
  }, [searchParams]);

  const handleVerify = async (hashToVerify: string) => {
    if (!hashToVerify.trim()) {
      toast.error('Please enter a hash to verify');
      return;
    }

    setVerifying(true);
    
    try {
      const result = await blockchainService.verifyHash(hashToVerify);
      setVerificationResult(result);
      
      if (result.exists) {
        toast.success('File verified successfully!');
      } else {
        toast.error('File not found on blockchain');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    
    try {
      const fileHash = await blockchainService.generateFileHash(file);
      setHash(fileHash);
      await handleVerify(fileHash);
    } catch (error) {
      console.error('File hash generation error:', error);
      toast.error('Failed to generate file hash');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'video/*': ['.mp4', '.avi', '.mov'],
      'audio/*': ['.mp3', '.wav', '.m4a']
    },
    maxFiles: 1
  });

  const handleCopyHash = async () => {
    try {
      await copyToClipboard(hash);
      toast.success('Hash copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy hash');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Truth Prevails
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Verify Digital Evidence
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Verify the authenticity of any file by checking its hash on the blockchain. 
            No account required - completely public and transparent.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload File to Verify
                </CardTitle>
                <CardDescription>
                  Upload a file to automatically generate its hash and verify it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-1">
                        Drag & drop a file here, or click to select
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports: PDF, Images, Documents, Videos, Audio
                      </p>
                    </div>
                  )}
                </div>
                
                {uploadedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{uploadedFile.name}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Manual Hash Verification */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Verify by Hash
                </CardTitle>
                <CardDescription>
                  Enter a file hash directly to verify its authenticity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hash" className="block text-sm font-medium text-gray-700 mb-2">
                      File Hash (SHA-256)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        id="hash"
                        type="text"
                        placeholder="Enter 64-character hash..."
                        value={hash}
                        onChange={(e) => setHash(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Button
                        onClick={() => handleVerify(hash)}
                        disabled={verifying || !hash.trim()}
                      >
                        {verifying ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {hash && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Hash:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                        {hash}
                      </code>
                      <button
                        onClick={handleCopyHash}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {verificationResult.exists ? (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="mr-2 h-5 w-5 text-red-600" />
                  )}
                  Verification Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={verificationResult.exists ? 'default' : 'destructive'}
                      className="text-sm"
                    >
                      {verificationResult.exists ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          VERIFIED
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          NOT VERIFIED
                        </>
                      )}
                    </Badge>
                  </div>

                  {verificationResult.exists ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Submitted by:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {truncateAddress(verificationResult.submitter)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(verificationResult.submitter)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Timestamp:</span>
                        <p className="mt-1">{formatDate(verificationResult.timestamp * 1000)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600">
                        This file hash was not found on the blockchain.
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        The file may not have been uploaded to Truth Prevails, or the hash is incorrect.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>How Verification Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h3 className="font-medium mb-2">Upload & Hash</h3>
                  <p className="text-gray-600">
                    Files are hashed using SHA-256 algorithm to create a unique fingerprint
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <h3 className="font-medium mb-2">Blockchain Storage</h3>
                  <p className="text-gray-600">
                    The hash is permanently stored on the blockchain, making it tamper-proof
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <h3 className="font-medium mb-2">Public Verification</h3>
                  <p className="text-gray-600">
                    Anyone can verify a file's authenticity by checking its hash on the blockchain
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { motion } from 'framer-motion';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
// Firebase Storage imports removed - will be handled by backend
import { auth, db, storage } from '@/lib/firebase';
import { blockchainService } from '@/lib/blockchain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Clock, CheckCircle, XCircle, Copy, Download, ExternalLink } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { formatBytes, formatDate, truncateAddress, copyToClipboard } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { generatePDFCertificate } from '@/lib/pdf-generator';
import { API_ENDPOINTS, UPLOAD_CONFIG } from '@/lib/config';

interface FileRecord {
  id: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: string;
  uploadTime: string;
  transactionHash?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  walletAddress: string;
  tamperCheck?: {
    status: 'clean' | 'suspicious' | 'failed';
    details?: string;
  };
}

export default function DashboardPage() {
  noStore(); // Disable static generation
  const [user, loading] = useAuthState(auth);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Get user profile and wallet address
      const userDocRef = doc(db, 'users', user.uid);
      const userUnsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setUserProfile(userData);
          setWalletAddress(userData.walletAddress || '');
        }
      });

      // Listen to user's files
      const q = query(
        collection(db, 'files'),
        where('userId', '==', user.uid),
        orderBy('uploadTime', 'desc')
      );

      const filesUnsubscribe = onSnapshot(q, (snapshot) => {
        const fileList: FileRecord[] = [];
        snapshot.forEach((doc) => {
          fileList.push({ id: doc.id, ...doc.data() } as FileRecord);
        });
        setFiles(fileList);
      });

      return () => {
        userUnsubscribe();
        filesUnsubscribe();
      };
    }
  }, [user, loading, router]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!user) return;

    setUploading(true);
    let uploadedCount = 0;
    let skippedCount = 0;
    
    try {
      for (const file of acceptedFiles) {
        // Generate file hash
        const fileHash = await blockchainService.generateFileHash(file);
        console.log(`File: ${file.name}, Hash: ${fileHash}`);
        
        // Create FormData for backend upload
        const formData = new FormData();
        formData.append('file', file);

        // Get Firebase auth token
        const token = await user?.getIdToken();
        if (!token) {
          throw new Error('Authentication required');
        }

        // Upload to backend
        const response = await fetch(API_ENDPOINTS.FILES.UPLOAD, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          console.log(`Response status: ${response.status}`);
          
          try {
            const errorData = await response.json();
            console.log('Error data:', errorData);
            
            if (response.status === 409) {
              // File already exists
              skippedCount++;
              const existingFileName = errorData.existingFileName || 'unknown file';
              toast.error(`File "${file.name}" has the same content as "${existingFileName}" in your account`);
              continue; // Skip to next file
            } else {
              throw new Error(errorData.error || 'Upload failed');
            }
          } catch (parseError) {
            console.log('Failed to parse error response:', parseError);
            if (response.status === 409) {
              // File already exists
              skippedCount++;
              toast.error(`File "${file.name}" has the same content as an existing file in your account`);
              continue; // Skip to next file
            } else {
              throw new Error('Upload failed');
            }
          }
        }

        const result = await response.json();
        
        // Submit hash to blockchain if not already done by backend
        if (!result.file.transactionHash) {
          try {
            const userDoc = await import('firebase/firestore').then(f => f.getDoc(f.doc(db, 'users', user.uid)));
            const userData = userDoc.data();
            
            if (!userData || !userData.encryptedWallet) {
              throw new Error('User data or encrypted wallet not found');
            }
            
            const walletInfo = blockchainService.decryptWalletInfo(userData.encryptedWallet);
            
            const transactionHash = await blockchainService.submitHash(fileHash, walletInfo.privateKey);
            
            // Update file record with transaction hash
            await import('firebase/firestore').then(f => f.updateDoc(f.doc(db, 'files', result.fileId), {
              transactionHash: transactionHash,
              verificationStatus: 'verified'
            }));
          } catch (error) {
            console.error('Blockchain submission failed:', error);
            toast.error('File uploaded but blockchain submission failed');
          }
        }
        
        uploadedCount++;
      }

      // Provide detailed feedback
      if (uploadedCount > 0 && skippedCount > 0) {
        toast.success(`${uploadedCount} file(s) uploaded, ${skippedCount} file(s) already existed`);
      } else if (uploadedCount > 0) {
        toast.success(`${uploadedCount} file(s) uploaded successfully!`);
      } else if (skippedCount > 0) {
        toast.success(`${skippedCount} file(s) already existed in your account`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: UPLOAD_CONFIG.ALLOWED_TYPES,
    maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE
  });

  const handleCopyHash = async (hash: string) => {
    try {
      await copyToClipboard(hash);
      toast.success('Hash copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy hash');
    }
  };

  const handleDownloadCertificate = async (file: FileRecord) => {
    try {
      const certificateData = {
        fileName: file.fileName,
        fileHash: file.fileHash,
        transactionHash: file.transactionHash,
        uploadTime: file.uploadTime,
        walletAddress: file.walletAddress,
        verificationUrl: `${window.location.origin}/verify?hash=${file.fileHash}`
      };

      await generatePDFCertificate(certificateData);
      toast.success('Certificate downloaded!');
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast.error('Failed to generate certificate');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Truth Prevails</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <Button
                variant="outline"
                onClick={() => auth.signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Connected Wallet
              </CardTitle>
              <CardDescription>
                Your blockchain wallet address for file verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {walletAddress ? (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Wallet Address</p>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded border">
                      {truncateAddress(walletAddress)}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(walletAddress)}
                      className="flex items-center"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://etherscan.io/address/${walletAddress}`, '_blank')}
                      className="flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading wallet information...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Upload Digital Evidence
              </CardTitle>
              <CardDescription>
                Upload your files to receive tamper-proof certificates using blockchain verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {uploading ? (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Uploading files...</p>
                  </div>
                ) : isDragActive ? (
                  <p className="text-blue-600">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports: PDF, Images, Documents, Videos, Audio (Max 50MB)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Duplicate files will be automatically detected and skipped
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Files History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Your Files ({files.length})
              </CardTitle>
              <CardDescription>
                View and manage your uploaded digital evidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No files uploaded yet</p>
                  <p className="text-sm text-gray-500">Upload your first file to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{file.fileName}</h3>
                            <Badge
                              variant={
                                file.verificationStatus === 'verified'
                                  ? 'default'
                                  : file.verificationStatus === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {file.verificationStatus === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
                              {file.verificationStatus === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                              {file.verificationStatus === 'failed' && <XCircle className="mr-1 h-3 w-3" />}
                              {file.verificationStatus}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Size:</span> {formatBytes(file.fileSize)}
                            </div>
                            <div>
                              <span className="font-medium">Uploaded:</span> {formatDate(new Date(file.uploadTime))}
                            </div>
                            <div>
                              <span className="font-medium">Wallet:</span> {truncateAddress(file.walletAddress)}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Hash:</span>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {truncateAddress(file.fileHash, 8)}
                              </code>
                              <button
                                onClick={() => handleCopyHash(file.fileHash)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {file.transactionHash && (
                            <div className="mt-2 flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-600">Transaction:</span>
                              <a
                                href={blockchainService.getTransactionUrl(file.transactionHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                {truncateAddress(file.transactionHash, 8)}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadCertificate(file)}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Certificate
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 

'use client';

import { motion } from 'framer-motion';
import { unstable_noStore as noStore } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileCheck, Zap, CheckCircle, Lock, Network } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  noStore(); // Disable static generation
  const features = [
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Tamper-Proof Verification",
      description: "Every file gets a unique SHA-256 hash stored on the blockchain, ensuring authenticity and preventing tampering."
    },
    {
      icon: <Network className="h-8 w-8 text-green-600" />,
      title: "Blockchain Immutability",
      description: "Leverage the power of blockchain technology to create permanent, unchangeable records of your digital evidence."
    },
    {
      icon: <Zap className="h-8 w-8 text-purple-600" />,
      title: "AI-Powered Detection",
      description: "Advanced AI algorithms analyze metadata and detect potential tampering or inconsistencies in your files."
    },
    {
      icon: <FileCheck className="h-8 w-8 text-orange-600" />,
      title: "Instant Verification",
      description: "Verify any file's authenticity in seconds with our public verification portal - no login required."
    },
    {
      icon: <Lock className="h-8 w-8 text-red-600" />,
      title: "Secure Storage",
      description: "Your files are encrypted and stored securely, with only the hash being sent to the blockchain."
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-emerald-600" />,
      title: "PDF Certificates",
      description: "Generate professional certificates with QR codes for easy verification and sharing."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Truth Prevails</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/verify">
                <Button variant="outline">Verify File</Button>
              </Link>
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <motion.h1 
              className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Secure Digital Evidence
              <span className="block text-blue-600">Verification Platform</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Upload your digital evidence and receive tamper-proof certificates using blockchain verification and AI-based forgery detection.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 py-3">
                  Start Verifying Files
                </Button>
              </Link>
              <Link href="/verify">
                <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                  Verify a File
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Truth Prevails?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge blockchain technology with AI-powered analysis to provide the most secure digital evidence verification system.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Secure Your Digital Evidence?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust Truth Prevails for their digital evidence verification needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/verify">
                <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
                  Try Verification
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Truth Prevails</h3>
            <p className="text-gray-400 mb-4">
              Secure digital evidence verification using blockchain and AI
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/verify" className="text-gray-400 hover:text-white">
                Verify Files
              </Link>
              <Link href="/login" className="text-gray-400 hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="text-gray-400 hover:text-white">
                Sign Up
              </Link>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm">
                © 2024 Truth Prevails. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 
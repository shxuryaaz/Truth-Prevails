import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import CryptoJS from 'crypto-js';

// Contract ABI - full ABI from compiled contract
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "HashSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "HashVerified",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hash",
        "type": "bytes32"
      }
    ],
    "name": "submitHash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hash",
        "type": "bytes32"
      }
    ],
    "name": "verifyHash",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private encryptionKey: string;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_URL || 'https://polygon-mumbai.g.alchemy.com/v2/your-key');
    
    // Only initialize contract if address is provided
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (contractAddress && contractAddress.trim() !== '') {
      this.contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        this.provider
      );
    } else {
      console.warn('Contract address not configured. Blockchain features will be disabled.');
      this.contract = null as any;
    }
    
    this.encryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'default-key';
  }

  // Generate a new wallet using BIP-39
  generateWallet(): WalletInfo {
    const mnemonic = bip39.generateMnemonic(256); // 24 words
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);
    const path = "m/44'/60'/0'/0/0"; // Ethereum derivation path
    const childKey = hdkey.derive(path);
    
    // Ensure private key is properly formatted as hex string
    const privateKeyBuffer = childKey.privateKey;
    const privateKey = privateKeyBuffer ? `0x${privateKeyBuffer.toString('hex')}` : '';
    
    if (!privateKey || privateKey === '0x') {
      throw new Error('Failed to generate valid private key');
    }
    
    const address = ethers.computeAddress(privateKey);

    return {
      address,
      privateKey,
      mnemonic
    };
  }

  // Encrypt wallet info for storage
  encryptWalletInfo(walletInfo: WalletInfo): string {
    const jsonString = JSON.stringify(walletInfo);
    return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
  }

  // Decrypt wallet info from storage
  decryptWalletInfo(encryptedData: string): WalletInfo {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  }

  // Submit hash to blockchain
  async submitHash(hash: string, privateKey: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your environment variables.');
    }
    
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);
      
      const tx = await contractWithSigner.submitHash(hash);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error('Error submitting hash to blockchain:', error);
      throw new Error('Failed to submit hash to blockchain');
    }
  }

  // Verify hash on blockchain
  async verifyHash(hash: string): Promise<{ exists: boolean; submitter: string; timestamp: number }> {
    if (!this.contract) {
      console.warn('Contract not configured. Returning mock verification result.');
      return {
        exists: false,
        submitter: '',
        timestamp: 0
      };
    }
    
    try {
      const result = await this.contract.verifyHash(hash);
      return {
        exists: result[0],
        submitter: result[1],
        timestamp: Number(result[2])
      };
    } catch (error) {
      console.error('Error verifying hash:', error);
      return {
        exists: false,
        submitter: '',
        timestamp: 0
      };
    }
  }

  // Get transaction URL for explorer
  getTransactionUrl(txHash: string): string {
    const network = process.env.NEXT_PUBLIC_NETWORK || 'mumbai';
    if (network === 'mumbai') {
      return `https://mumbai.polygonscan.com/tx/${txHash}`;
    } else if (network === 'sepolia') {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return `https://etherscan.io/tx/${txHash}`;
  }

  // Generate SHA-256 hash of file
  async generateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const hash = ethers.sha256(uint8Array);
          resolve(hash);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}

export const blockchainService = new BlockchainService(); 
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TruthProof", function () {
  let truthProof;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contract
    const TruthProof = await ethers.getContractFactory("TruthProof");
    truthProof = await TruthProof.deploy();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await truthProof.getAddress()).to.be.properAddress;
    });

    it("Should start with zero hashes", async function () {
      expect(await truthProof.getTotalHashes()).to.equal(0);
    });
  });

  describe("Hash Submission", function () {
    const testHash = "0x1234567890123456789012345678901234567890123456789012345678901234";

    it("Should submit hash successfully", async function () {
      await expect(truthProof.connect(user1).submitHash(testHash))
        .to.emit(truthProof, "HashSubmitted")
        .withArgs(testHash, user1.address, await time());

      expect(await truthProof.getTotalHashes()).to.equal(1);
    });

    it("Should not allow duplicate hash submission", async function () {
      await truthProof.connect(user1).submitHash(testHash);
      
      await expect(truthProof.connect(user2).submitHash(testHash))
        .to.be.revertedWith("Hash already exists");
    });

    it("Should not allow zero hash submission", async function () {
      await expect(truthProof.connect(user1).submitHash(ethers.ZeroHash))
        .to.be.revertedWith("Invalid hash");
    });

    it("Should track submitter correctly", async function () {
      await truthProof.connect(user1).submitHash(testHash);
      
      const verification = await truthProof.verifyHash(testHash);
      expect(verification[1]).to.equal(user1.address);
    });
  });

  describe("Hash Verification", function () {
    const testHash = "0x1234567890123456789012345678901234567890123456789012345678901234";

    it("Should verify existing hash", async function () {
      await truthProof.connect(user1).submitHash(testHash);
      
      const verification = await truthProof.verifyHash(testHash);
      expect(verification[0]).to.be.true; // exists
      expect(verification[1]).to.equal(user1.address); // submitter
      expect(verification[2]).to.be.gt(0); // timestamp
    });

    it("Should return false for non-existent hash", async function () {
      const nonExistentHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      
      const verification = await truthProof.verifyHash(nonExistentHash);
      expect(verification[0]).to.be.false; // exists
      expect(verification[1]).to.equal(ethers.ZeroAddress); // submitter
      expect(verification[2]).to.equal(0); // timestamp
    });
  });

  describe("Statistics", function () {
    const hash1 = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const hash2 = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";

    it("Should track total hashes correctly", async function () {
      expect(await truthProof.getTotalHashes()).to.equal(0);
      
      await truthProof.connect(user1).submitHash(hash1);
      expect(await truthProof.getTotalHashes()).to.equal(1);
      
      await truthProof.connect(user2).submitHash(hash2);
      expect(await truthProof.getTotalHashes()).to.equal(2);
    });

    it("Should return all hashes", async function () {
      await truthProof.connect(user1).submitHash(hash1);
      await truthProof.connect(user2).submitHash(hash2);
      
      const allHashes = await truthProof.getAllHashes();
      expect(allHashes).to.include(hash1);
      expect(allHashes).to.include(hash2);
      expect(allHashes.length).to.equal(2);
    });

    it("Should return hashes by submitter", async function () {
      await truthProof.connect(user1).submitHash(hash1);
      await truthProof.connect(user2).submitHash(hash2);
      
      const user1Hashes = await truthProof.getHashesBySubmitter(user1.address);
      expect(user1Hashes).to.include(hash1);
      expect(user1Hashes.length).to.equal(1);
      
      const user2Hashes = await truthProof.getHashesBySubmitter(user2.address);
      expect(user2Hashes).to.include(hash2);
      expect(user2Hashes.length).to.equal(1);
    });

    it("Should check if address has submitted hashes", async function () {
      expect(await truthProof.hasSubmittedHashes(user1.address)).to.be.false;
      
      await truthProof.connect(user1).submitHash(hash1);
      expect(await truthProof.hasSubmittedHashes(user1.address)).to.be.true;
    });
  });

  describe("Recent Hashes", function () {
    const hashes = [
      "0x1111111111111111111111111111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333333333333333333333333333",
      "0x4444444444444444444444444444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555555555555555555555555555"
    ];

    it("Should return recent hashes", async function () {
      for (let i = 0; i < hashes.length; i++) {
        await truthProof.connect(user1).submitHash(hashes[i]);
      }
      
      const recent3 = await truthProof.getRecentHashes(3);
      expect(recent3.length).to.equal(3);
      expect(recent3[0]).to.equal(hashes[2]); // Most recent
      expect(recent3[2]).to.equal(hashes[4]); // Oldest of recent 3
    });

    it("Should handle request for more hashes than exist", async function () {
      await truthProof.connect(user1).submitHash(hashes[0]);
      
      const recent10 = await truthProof.getRecentHashes(10);
      expect(recent10.length).to.equal(1);
      expect(recent10[0]).to.equal(hashes[0]);
    });
  });

  describe("Contract Statistics", function () {
    it("Should return contract stats", async function () {
      const stats = await truthProof.getContractStats();
      expect(stats[0]).to.equal(0); // totalHashes
      expect(stats[1]).to.be.gt(0); // contractCreationTime
    });
  });
});

// Helper function to get current timestamp
async function time() {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp;
} 
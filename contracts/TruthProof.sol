// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TruthProof
 * @dev Smart contract for storing and verifying digital evidence hashes
 * @author Truth Prevails Team
 */
contract TruthProof {
    // Struct to store file verification data
    struct FileVerification {
        bytes32 hash;
        address submitter;
        uint256 timestamp;
        bool exists;
    }

    // Mapping from hash to verification data
    mapping(bytes32 => FileVerification) public fileVerifications;
    
    // Array to store all submitted hashes for enumeration
    bytes32[] public allHashes;
    
    // Events
    event HashSubmitted(bytes32 indexed hash, address indexed submitter, uint256 timestamp);
    event HashVerified(bytes32 indexed hash, address indexed submitter, uint256 timestamp);

    // Modifiers
    modifier hashNotExists(bytes32 _hash) {
        require(!fileVerifications[_hash].exists, "Hash already exists");
        _;
    }

    modifier hashExists(bytes32 _hash) {
        require(fileVerifications[_hash].exists, "Hash does not exist");
        _;
    }

    /**
     * @dev Submit a file hash to the blockchain
     * @param _hash The SHA-256 hash of the file
     */
    function submitHash(bytes32 _hash) public hashNotExists(_hash) {
        require(_hash != bytes32(0), "Invalid hash");
        
        FileVerification memory verification = FileVerification({
            hash: _hash,
            submitter: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        fileVerifications[_hash] = verification;
        allHashes.push(_hash);
        
        emit HashSubmitted(_hash, msg.sender, block.timestamp);
    }

    /**
     * @dev Verify if a hash exists on the blockchain
     * @param _hash The hash to verify
     * @return exists Whether the hash exists
     * @return submitter The address that submitted the hash
     * @return timestamp When the hash was submitted
     */
    function verifyHash(bytes32 _hash) public view returns (bool exists, address submitter, uint256 timestamp) {
        FileVerification memory verification = fileVerifications[_hash];
        return (verification.exists, verification.submitter, verification.timestamp);
    }

    /**
     * @dev Get verification data for a hash
     * @param _hash The hash to get data for
     * @return The complete verification data
     */
    function getVerificationData(bytes32 _hash) public view hashExists(_hash) returns (FileVerification memory) {
        return fileVerifications[_hash];
    }

    /**
     * @dev Get the total number of submitted hashes
     * @return The count of all submitted hashes
     */
    function getTotalHashes() public view returns (uint256) {
        return allHashes.length;
    }

    /**
     * @dev Get all hashes (for enumeration purposes)
     * @return Array of all submitted hashes
     */
    function getAllHashes() public view returns (bytes32[] memory) {
        return allHashes;
    }

    /**
     * @dev Get hashes submitted by a specific address
     * @param _submitter The address to query
     * @return Array of hashes submitted by the address
     */
    function getHashesBySubmitter(address _submitter) public view returns (bytes32[] memory) {
        bytes32[] memory tempHashes = new bytes32[](allHashes.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allHashes.length; i++) {
            if (fileVerifications[allHashes[i]].submitter == _submitter) {
                tempHashes[count] = allHashes[i];
                count++;
            }
        }
        
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempHashes[i];
        }
        
        return result;
    }

    /**
     * @dev Check if an address has submitted any hashes
     * @param _submitter The address to check
     * @return Whether the address has submitted any hashes
     */
    function hasSubmittedHashes(address _submitter) public view returns (bool) {
        for (uint256 i = 0; i < allHashes.length; i++) {
            if (fileVerifications[allHashes[i]].submitter == _submitter) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get recent hashes (last N hashes)
     * @param _count Number of recent hashes to return
     * @return Array of recent hashes
     */
    function getRecentHashes(uint256 _count) public view returns (bytes32[] memory) {
        uint256 totalHashes = allHashes.length;
        uint256 count = _count > totalHashes ? totalHashes : _count;
        
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allHashes[totalHashes - count + i];
        }
        
        return result;
    }

    /**
     * @dev Emergency function to pause contract (only owner)
     * Note: This would require adding Ownable functionality
     */
    // function emergencyPause() public onlyOwner {
    //     // Implementation for emergency pause
    // }

    /**
     * @dev Get contract statistics
     * @return totalHashes Total number of submitted hashes
     * @return contractCreationTime When the contract was deployed
     */
    function getContractStats() public view returns (uint256 totalHashes, uint256 contractCreationTime) {
        return (allHashes.length, block.timestamp);
    }
} 
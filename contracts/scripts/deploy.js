const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TruthProof contract...");

  // Get the contract factory
  const TruthProof = await hre.ethers.getContractFactory("TruthProof");
  
  // Deploy the contract
  const truthProof = await TruthProof.deploy();
  
  // Wait for deployment to finish
  await truthProof.waitForDeployment();
  
  const address = await truthProof.getAddress();
  
  console.log("✅ TruthProof deployed to:", address);
  console.log("📋 Contract address:", address);
  console.log("🔗 Network:", hre.network.name);
  console.log("⛽ Gas used:", (await truthProof.deploymentTransaction()).gasLimit.toString());
  
  // Verify the contract on Etherscan/Polygonscan
  if (hre.network.name !== "hardhat") {
    console.log("🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("❌ Contract verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📝 Next steps:");
  console.log("1. Update your .env file with the contract address:", address);
  console.log("2. Update your frontend environment variables");
  console.log("3. Test the contract functionality");
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 
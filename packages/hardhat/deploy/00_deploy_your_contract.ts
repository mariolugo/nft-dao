import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { network } from "hardhat";
/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("CryptoDevsNFT", {
    from: deployer,
    // Contract constructor arguments
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
  const nftContract = await hre.ethers.getContract("CryptoDevsNFT", deployer);
  console.log("CryptoDevsNFT deployed to:", nftContract.address);

  await deploy("FakeNFTMarketplace", {
    from: deployer,
    // Contract constructor arguments
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
  const fakeNftMarketplaceContract = await hre.ethers.getContract("FakeNFTMarketplace", deployer);
  console.log("FakeNFTMarketplace deployed to:", fakeNftMarketplaceContract.address);

  // Deploy the DAO Contract
  const amount = hre.ethers.utils.parseEther("1"); // You can change this value from 1 ETH to something else
  await deploy("CryptoDevsDAO", {
    from: deployer,
    // Contract constructor arguments
    log: true,
    args: [fakeNftMarketplaceContract.address, nftContract.address],
    value: amount,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
  const daoContract = await hre.ethers.getContract("CryptoDevsDAO", deployer);

  console.log({ network });
  if (network.name !== "localhost") {
    // Sleep for 30 seconds to let Etherscan catch up with the deployments
    await sleep(30 * 1000);

    // Verify the Fake Marketplace Contract
    await hre.run("verify:verify", {
      address: fakeNftMarketplaceContract.address,
      constructorArguments: [],
    });

    // Verify the DAO Contract
    await hre.run("verify:verify", {
      address: daoContract.address,
      constructorArguments: [fakeNftMarketplaceContract.address, nftContract.address],
    });
  }
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["CryptoDevsDAO", "CryptoDevsNFT", "FakeNFTMarketplace"];

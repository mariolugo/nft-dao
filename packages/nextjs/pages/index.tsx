import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { NextPage } from "next";
import { formatEther } from "viem/utils";
import { useAccount, useBalance, useNetwork } from "wagmi";
import { readContract } from "wagmi/actions";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { MetaHeader } from "~~/components/MetaHeader";
import deployedContracts from "~~/contracts/deployedContracts";
import { useDeployedContractInfo, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { data: deployedContract } = useDeployedContractInfo("CryptoDevsDAO");
  const { chain } = useNetwork();
  const { address, isConnected } = useAccount();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  const [proposals, setProposals] = useState([]);
  const [selectedTab, setSelectedTab] = useState("Create Proposal");
  const [proposalId, setProposalId] = useState(0);
  const [vote, setVote] = useState();

  const chainId = chain?.id ?? 0;

  const { data: daoOwner } = useScaffoldContractRead({
    contractName: "CryptoDevsDAO",
    functionName: "owner",
  });

  // Fetch the balance of the DAO
  const daoBalance = useBalance({
    address: (deployedContracts as any)[chainId as number]?.CryptoDevsDAO.address,
  });

  // Fetch the number of proposals in the DAO
  const { data: numOfProposalsInDAO } = useScaffoldContractRead({
    contractName: "CryptoDevsDAO",
    functionName: "numProposals",
  });

  // Fetch the CryptoDevs NFT balance of the user
  const { data: nftBalanceOfUser } = useScaffoldContractRead({
    contractName: "CryptoDevsNFT",
    functionName: "balanceOf",
    args: [address],
  });

  const { writeAsync: createProposal } = useScaffoldContractWrite({
    contractName: "CryptoDevsDAO",
    functionName: "createProposal",
    args: [BigInt(fakeNftTokenId)],
  });

  const { writeAsync: voteOnProposal } = useScaffoldContractWrite({
    contractName: "CryptoDevsDAO",
    functionName: "voteOnProposal",
    args: [BigInt(proposalId), vote],
  });

  const { writeAsync: executeProposal } = useScaffoldContractWrite({
    contractName: "CryptoDevsDAO",
    functionName: "executeProposal",
    args: [BigInt(proposalId)],
  });

  const { writeAsync: withdrawEther } = useScaffoldContractWrite({
    contractName: "CryptoDevsDAO",
    functionName: "withdrawEther",
  });

  /**
   * Created proposal
   */
  async function handleCreateProposal() {
    setLoading(true);

    try {
      await createProposal();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetch proposal id
   */
  async function fetchProposalById(id: number) {
    try {
      if (deployedContract) {
        const proposal = await readContract({
          address: deployedContract?.address,
          abi: deployedContract?.abi,
          functionName: "proposals",
          args: [BigInt(id)],
        });
        const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;

        const parsedProposal = {
          proposalId: id,
          nftTokenId: nftTokenId.toString(),
          deadline: new Date(parseInt(deadline.toString()) * 1000),
          yayVotes: yayVotes.toString(),
          nayVotes: nayVotes.toString(),
          executed: Boolean(executed),
        };

        return parsedProposal;
      }
      return null;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Function to fetch all proposals in the DAO
   * @returns
   */
  async function fetchAllProposals() {
    try {
      const proposals: any[] = [];

      if (numOfProposalsInDAO) {
        for (let i = 0; i < numOfProposalsInDAO; i++) {
          const proposal = await fetchProposalById(i);
          proposals.push(proposal);
        }

        setProposals(proposals as any);
      }
      return proposals;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  /**
   *  Function to execute a proposal after deadline has been exceeded
   */
  async function handleExecuteProposal() {
    setLoading(true);
    try {
      await executeProposal();
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to vote YAY or NAY on a proposal
  async function voteForProposal() {
    setLoading(true);
    try {
      await voteOnProposal();
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  async function withdraw() {
    setLoading(true);
    try {
      await withdrawEther();
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div>
          <p>Loading... Waiting for transaction...</p>
        </div>
      );
    } else if (nftBalanceOfUser === BigInt(0)) {
      return (
        <div>
          <p>
            {" "}
            You do not own any CryptoDevs NFTs. <br />
            <b>You cannot create or vote on proposals</b>
          </p>
        </div>
      );
    } else {
      return (
        <div>
          <label>Fake NFT Token ID to Purchase: </label>
          <input placeholder="0" type="number" onChange={e => setFakeNftTokenId(e.target.value)} />
          <button onClick={() => createProposal()}>Create</button>
        </div>
      );
    }
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  if (!isMounted) return null;

  console.log(daoOwner);

  return (
    <>
      <MetaHeader />
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <div>
            <p>Your CryptoDevs NFT Balance: {nftBalanceOfUser?.toString()}</p>
            <p>{daoBalance.data && <>Treasury Balance: {formatEther(daoBalance.data.value).toString()} ETH</>}</p>
            <p>Total Number of Proposals: {numOfProposalsInDAO?.toString()}</p>
          </div>
          <div className="tabs tabs-boxed">
            <div
              onClick={() => setSelectedTab("Create Proposal")}
              className={clsx("tab", {
                "tab-active": selectedTab === "Create Proposal",
              })}
            >
              Tab 1
            </div>
            <div
              onClick={() => setSelectedTab("View Proposals")}
              className={clsx("tab", {
                "tab-active": selectedTab === "View Proposals",
              })}
            >
              Tab 2
            </div>
          </div>
          {selectedTab === "Create Proposal" && <>{renderCreateProposalTab()}</>}
          <div>
            {address && address.toLowerCase() === daoOwner?.toLowerCase() ? (
              <div>{loading ? <button>Loading...</button> : <button onClick={withdraw}>Withdraw DAO ETH</button>}</div>
            ) : (
              ""
            )}
          </div>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Tinker with your smart contract using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contract
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore your local transactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;

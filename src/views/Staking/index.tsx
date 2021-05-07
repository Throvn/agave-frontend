import React from "react";
import { useAppWeb3 } from "../../hooks/appWeb3";
import { getChainAddresses } from "../../utils/chainAddresses";
import { StakingLayout } from "./layout";
import { useTotalStakedForAllUsers } from "./queries";

export interface StakingProps {}

export const Staking: React.FC<StakingProps> = (_props) => {
  const w3 = useAppWeb3(); // We don't unpack because otherwise typescript loses useAppWeb3's magic
  const rewards = useTotalStakedForAllUsers();
  if (w3.library == null) {
    return <>Staking requires access to Web3 via your wallet. Please connect it to continue.</>;
  }
  const chainAddrs = getChainAddresses(w3.chainId);
  if (chainAddrs == null) {
    return <>You are on an unsupported chain. How did you even do that?</>;
  }

  console.log("Total rewards: ", rewards);
  const agavePerMonth = 1.98;
  const cooldownPeriodSeconds = 60 * 60 * 24 * 10;
  const stakingAPY = 0.791;
  return StakingLayout({
    agavePerMonth,
    cooldownPeriodSeconds,
    stakingAPY,
  });
};

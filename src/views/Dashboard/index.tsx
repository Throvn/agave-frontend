import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./layout";
import {
  useUserDepositAssetBalancesWithReserveInfo,
  useUserVariableDebtTokenBalances,
} from "../../queries/userAssets";
import { BigNumber } from "ethers";
import { ReserveTokenDefinition } from "../../queries/allReserveTokens";
import { useAppWeb3 } from "../../hooks/appWeb3";
import { useUserAccountData } from "../../queries/userAccountData";
import { useNativeSymbols } from "../../utils/icons";
import { useUserRewards } from "../../queries/rewardTokens";

import {
  ReserveAssetConfiguration,
  useMultipleProtocolReserveConfiguration,
} from "../../queries/protocolAssetConfiguration";

export interface AssetData {
  tokenAddress: string;
  symbol: string;
  backingReserve?: ReserveTokenDefinition | undefined;
  balance: BigNumber;
}

export const Dashboard: React.FC<{}> = () => {
  type AssetConfigurationWithAddress = ReserveAssetConfiguration & {
    tokenAddress: string;
  };

  // Overall borrow information
  const { account: userAccountAddress } = useAppWeb3();
  const { data: userAccountData } = useUserAccountData(
    userAccountAddress ?? undefined
  );
  const healthFactor = userAccountData?.healthFactor;
  const collateral = userAccountData?.totalCollateralEth;
  const borrowed = userAccountData?.totalDebtEth;

  const [tokenConfigs, setTokenConfigs] = useState<
    Array<AssetConfigurationWithAddress>
  >([]);

  // Borrow list
  const borrows = useUserVariableDebtTokenBalances();
  const borrowsAddress: string[] | undefined = borrows?.data
    ?.filter(asset => !asset.balance.isZero())
    .map(borrow => borrow.tokenAddress);

  // Deposit list
  const balances = useUserDepositAssetBalancesWithReserveInfo();
  const backingBalancesAddress = balances?.data
    ?.filter(asset => !asset.balance.isZero())
    .map(a => a.reserve?.tokenAddress);

  const tokenAddresses = borrowsAddress
    ?.concat(backingBalancesAddress ?? [])
    .filter((v, i, a) => a.indexOf(v) === i);

  const assetConfigs: Array<AssetConfigurationWithAddress> | undefined =
    useMultipleProtocolReserveConfiguration(tokenAddresses)?.data;

  useEffect(() => {
    if (assetConfigs) {
      Promise.all(assetConfigs).then(tokens => {
        tokens.forEach(token => {
          setTokenConfigs(tokenConfigs => [...tokenConfigs, token]);
        });
      });
    }
  }, [assetConfigs]);

  const nativeSymbols = useNativeSymbols();
  const borrowedList: AssetData[] = React.useMemo(() => {
    const assets =
      borrows?.data?.filter(asset => !asset.balance.isZero()) ?? [];

    return assets
      .map(asset => {
        return asset.symbol === nativeSymbols.wrappednative
          ? {
              ...asset,
              symbol: nativeSymbols?.native,
            }
          : asset;
      })
      .filter(asset => {
        const config = tokenConfigs.find(
          tokenConfig =>
            tokenConfig.tokenAddress === asset.tokenAddress
        );
        return config?.isActive && !config?.isFrozen;
      });
  }, [borrows]);

  const depositedList: AssetData[] = React.useMemo(() => {
    const assets = (
      balances?.data?.filter(asset => !asset.balance.isZero()) ?? []
    ).map(a => ({ ...a, backingReserve: a.reserve }));

    return assets
      .map(asset => {
        return asset.backingReserve?.symbol === nativeSymbols.wrappednative
          ? {
              ...asset,
              backingReserve: {
                ...asset.backingReserve,
                symbol: nativeSymbols.native,
              },
            }
          : asset;
      })
      .filter(asset => {
        const config = tokenConfigs.find(
          tokenConfig =>
            tokenConfig.tokenAddress === asset.backingReserve.tokenAddress
        );
        return config?.isActive && !config?.isFrozen;
      });
  }, [balances]);

  // Rewards information
  const userRewards = useUserRewards();

  return (
    <DashboardLayout
      borrowed={borrowed}
      collateral={collateral}
      borrows={borrowedList}
      deposits={depositedList}
      healthFactor={healthFactor}
    />
  );
};

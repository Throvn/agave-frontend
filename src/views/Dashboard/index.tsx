import React from "react";
import { DashboardLayout } from "./layout";
import {
  useUserDepositAssetBalancesWithReserveInfo,
  useUserVariableDebtTokenBalances,
} from "../../queries/userAssets";
import { BigNumber } from "ethers";
import { ReserveTokenDefinition } from "../../queries/allReserveTokens";
import { useAppWeb3 } from "../../hooks/appWeb3";
import { useUserAccountData } from "../../queries/userAccountData";

export interface AssetData {
  tokenAddress: string;
  symbol: string;
  backingReserve?: ReserveTokenDefinition | undefined;
  balance: BigNumber;
}

export const Dashboard: React.FC<{}> = () => {
  // Overall borrow information
  const { account: userAccountAddress } = useAppWeb3();
  const { data: userAccountData } = useUserAccountData(
    userAccountAddress ?? undefined
  );
  const healthFactor = userAccountData?.healthFactor;
  const collateral = userAccountData?.totalCollateralEth;
  const borrowed = userAccountData?.totalDebtEth;

  // Borrow list
  const borrows = useUserVariableDebtTokenBalances();
  const borrowedList: AssetData[] = React.useMemo(() => {
    const assets =
      borrows?.data?.filter(asset => !asset.balance.isZero()) ?? [];

    return assets.map(asset => {
      return asset.symbol === "WXDAI"
        ? {
            ...asset,
            symbol: "XDAI",
          }
        : asset;
    });
  }, [borrows]);

  // Deposit list
  const balances = useUserDepositAssetBalancesWithReserveInfo();
  const depositedList: AssetData[] = React.useMemo(() => {
    const assets = (
      balances?.data?.filter(asset => !asset.balance.isZero()) ?? []
    ).map(a => ({ ...a, backingReserve: a.reserve }));
    return assets.map(asset => {
      return asset.backingReserve && asset.backingReserve.symbol === "WXDAI"
        ? {
            ...asset,
            backingReserve: { ...asset.backingReserve, symbol: "XDAI" },
          }
        : asset;
    });
  }, [balances]);

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
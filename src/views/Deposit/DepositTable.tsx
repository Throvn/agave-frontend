import React from "react";
import { ethers } from "ethers";
import { CellProps, Column, Renderer } from "react-table";
import { useAllReserveTokensWithData } from "../../queries/lendingReserveData";
import { useAssetPriceInDai } from "../../queries/assetPriceInDai";
import {
  BasicTableRenderer,
  SortedHtmlTable,
  TableRenderer,
} from "../../utils/htmlTable";
import { DepositAPYView } from "../common/DepositAPYView"
import { Box, Text } from "@chakra-ui/layout";
import { Center, Flex } from "@chakra-ui/react";
import { TokenIcon } from "../../utils/icons";
import { useUserAssetBalance } from "../../queries/userAssets";
import { Link, useHistory } from "react-router-dom";

const BalanceView: React.FC<{ tokenAddress: string }> = ({ tokenAddress }) => {
  const price = useAssetPriceInDai(tokenAddress);
  const balance = useUserAssetBalance(tokenAddress);
  const balanceNumber = balance.data
    ? Number(ethers.utils.formatEther(balance.data))
    : undefined;
  const balanceUSD = balanceNumber
    ? (Number(price.data) * balanceNumber).toFixed(2)
    : "-";

  return React.useMemo(() => {
    return (
      <Flex direction="column" minH={30} ml={2}>
        <Box w="14rem" textAlign="center">
          <Text p={3} fontWeight="bold">
            {balanceNumber?.toFixed(3) ?? "-"}
          </Text>
          <Text p={3}>$ {balanceUSD ?? "-"}</Text>
        </Box>
      </Flex>
    );
  }, [balanceNumber, balanceUSD]);
};

export const DepositTable: React.FC<{ activeType: string }> = ({ activeType }) => {
  const history = useHistory();
  interface AssetRecord {
    symbol: string;
    tokenAddress: string;
    aTokenAddress: string;
  }

  const reserves = useAllReserveTokensWithData();
  const assetRecords = React.useMemo(() => {
    return (
      reserves.data?.map(
        ({ symbol, tokenAddress, aTokenAddress }): AssetRecord => ({
          symbol,
          tokenAddress,
          aTokenAddress,
        })
      ) ?? []
    );
  }, [reserves]);

  const columns: Column<AssetRecord>[] = React.useMemo(
    () => [
      {
        Header: "Asset",
        accessor: record => record.symbol, // We use row.original instead of just record here so we can sort by symbol
        Cell: (({ value, row }) => (
          <Flex
            width="100%"
            height="100%"
            alignItems={"center"}
            onClick={() => {
              history.push(`/deposit/${value}`);
            }}
          >
            <Center width="4rem">
              <TokenIcon symbol={value} />
            </Center>
            <Box w="1rem"></Box>
            <Box>
              <Text>
                <Link to={`/deposit/${value}`}>{value}</Link>
              </Text>
            </Box>
          </Flex>
        )) as Renderer<CellProps<AssetRecord, string>>,
      },
      {
        Header: "Your wallet balance",
        accessor: row => row.tokenAddress,
        Cell: (({ value }) => <BalanceView tokenAddress={value} />) as Renderer<
          CellProps<AssetRecord, string>
        >,
      },
      {
        Header: "APY",
        accessor: row => row.tokenAddress,
        Cell: (({ value }) => (
          <DepositAPYView tokenAddress={value} />
        )) as Renderer<CellProps<AssetRecord, string>>,
      },
    ],
    [history]
  );

  const renderer = React.useCallback<TableRenderer<AssetRecord>>(
    table => (
      <BasicTableRenderer
        table={table}
        tableProps={{
          style: {
            borderSpacing: "0 1em",
            borderCollapse: "separate",
          },
        }}
        headProps={{
          fontSize: "12px",
          fontFamily: "inherit",
          color: "white",
          border: "none",
        }}
        rowProps={{
          // rounded: { md: "lg" }, // "table-row" display mode can't do rounded corners
          bg: { base: "secondary.500", md: "secondary.900" },
        }}
        cellProps={{
          borderBottom: "none",
        }}
      />
    ),
    []
  );

  return (
    <div>
      <SortedHtmlTable columns={columns} data={assetRecords}>
        {renderer}
      </SortedHtmlTable>
    </div>
  );
};

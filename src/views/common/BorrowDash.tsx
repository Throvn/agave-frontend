import {
  Box,
  HStack,
  Stack,
  Text,
  VStack,
  useMediaQuery,
  Flex,
  tokenToCSSVar,
  Grid,
  GridItem,
  Popover,
  Button,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
} from "@chakra-ui/react";
import React, { useEffect } from "react";
import ColoredText from "../../components/ColoredText";
import { useAppWeb3 } from "../../hooks/appWeb3";
import { ReserveTokenDefinition } from "../../queries/allReserveTokens";
import { useAssetPriceInDai } from "../../queries/assetPriceInDai";
import { useAssetUtilizationRate } from "../../queries/assetUtilizationRate";
import { useAllReserveTokensWithData } from "../../queries/lendingReserveData";
import { useProtocolReserveConfiguration } from "../../queries/protocolAssetConfiguration";
import { BigNumber, constants, FixedNumber } from "ethers";
import { useUserAccountData } from "../../queries/userAccountData";
import { useUserReserveAssetBalancesDaiWei } from "../../queries/userAssets";
import {
  useUserReserveData,
  useProtocolReserveData,
  useUserReservesData,
} from "../../queries/protocolReserveData";
import { useUserAssetBalance } from "../../queries/userAssets";
import { fontSizes, spacings, assetColor } from "../../utils/constants";
import { ModalIcon } from "../../utils/icons";
import { TokenIcon } from "../../utils/icons";
import {
  bigNumberToString,
  fixedNumberToPercentage,
} from "../../utils/fixedPoint";
import { CollateralComposition } from "../../components/Chart/CollateralComposition";

type BorrowDashProps = {
  token: ReserveTokenDefinition;
};

export const BorrowDash: React.FC<BorrowDashProps> = ({ token }) => {
  const { account: userAccountAddress } = useAppWeb3();
  const { data: reserves } = useAllReserveTokensWithData();
  const tokenAddresses = reserves?.map(
    token => {
      return token.tokenAddress;
    },
    [String]
  );
  const reserve = React.useMemo(
    () =>
      reserves?.find(reserve => reserve.tokenAddress === token.tokenAddress) ??
      reserves?.find(
        reserve =>
          reserve.tokenAddress.toLowerCase() ===
          token.tokenAddress.toLowerCase()
      ),
    [reserves, token.tokenAddress]
  );
  const { data: reserveProtocolData } = useProtocolReserveData(
    reserve?.tokenAddress
  );
  const { data: reserveConfiguration } = useProtocolReserveConfiguration(
    reserve?.tokenAddress
  );
  const { data: userAccountData } = useUserAccountData(
    userAccountAddress ?? undefined
  );
  const { data: allUserReservesBalances } = useUserReserveAssetBalancesDaiWei();
  const { data: tokenBalance } = useUserAssetBalance(token.tokenAddress);
  const { data: aTokenBalance } = useUserAssetBalance(reserve?.aTokenAddress);
  const { data: utilizationData } = useAssetUtilizationRate(token.tokenAddress);
  const { data: assetPriceInDai } = useAssetPriceInDai(reserve?.tokenAddress);
  const { data: allUserReservesData } = useUserReservesData(tokenAddresses);

  const utilizationRate = utilizationData?.utilizationRate;
  const liquidityAvailable = reserveProtocolData?.availableLiquidity;
  const maximumLtv = reserveConfiguration?.ltv;
  const currentLtv = userAccountData?.currentLtv;
  const variableBorrowAPR = reserveProtocolData?.variableBorrowRate;
  const healthFactor = userAccountData?.healthFactor;
  const totalCollateralEth = userAccountData?.totalCollateralEth;
  const userStableDebt =
    allUserReservesData?.[token.tokenAddress]?.currentStableDebt;
  const userVariableDebt =
    allUserReservesData?.[token.tokenAddress]?.currentVariableDebt;

  const totalCollateralValue = React.useMemo(() => {
    return allUserReservesBalances?.reduce(
      (memo: BigNumber, next) =>
        next.daiWeiPriceTotal !== null ? memo.add(next.daiWeiPriceTotal) : memo,
      constants.Zero
    );
  }, [allUserReservesBalances]);

  const collateralComposition = React.useMemo(() => {
    const compositionArray = allUserReservesBalances?.map((next, index) => {
      const withCollateralEnabled =
        allUserReservesData?.[next.tokenAddress]?.usageAsCollateralEnabled;
      if (
        next.daiWeiPriceTotal !== null &&
        next.decimals &&
        totalCollateralValue &&
        !totalCollateralValue.eq(BigNumber.from(0)) &&
        withCollateralEnabled
      ) {
        const decimalPower = BigNumber.from(10).pow(next.decimals);
        return next.daiWeiPriceTotal
          .mul(decimalPower)
          .div(totalCollateralValue);
      } else return BigNumber.from(0);
    });
    return compositionArray
      ? compositionArray.map(share => {
          if (share.gt(0)) {
            return bigNumberToString(share.mul(100));
          } else return null;
        })
      : [];
  }, [allUserReservesBalances, totalCollateralValue]);

  const collateralData = collateralComposition.map((x, index) => {
    if (x !== null) return x.substr(0, x.indexOf(".") + 3);
  });

  const [isSmallerThan400, isSmallerThan900] = useMediaQuery([
    "(max-width: 400px)",
    "(max-width: 900px)",
  ]);

  return (
    <VStack spacing="0" w="100%" bg="primary.900" rounded="lg">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        fontSize={{ base: fontSizes.md, md: fontSizes.md }}
        w="100%"
        borderBottom="3px solid"
        borderBottomColor="primary.50"
        py={{ base: "1rem", md: "1rem" }}
        px={{ base: "1rem", md: "2.4rem" }}
      >
        <Flex
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", lg: "center" }}
          justifyContent="flex-start"
        >
          <TokenIcon
            symbol={token.symbol}
            borderRadius="100%"
            p="2px"
            background="whiteAlpha.500"
            border="2px solid"
            borderColor="whiteAlpha.600"
          />
          <Flex
            flexDirection={{ base: "column", lg: "row" }}
            justifyContent="flex-start"
            alignItems="center"
          >
            <ColoredText
              fontSize={{
                base: fontSizes.md,
                md: fontSizes.lg,
                lg: fontSizes.xl,
              }}
              mx="1.5rem"
            >
              {token.symbol}
            </ColoredText>
            <Text
              fontSize={{
                base: fontSizes.sm,
                md: fontSizes.md,
                lg: fontSizes.lg,
              }}
              fontWeight="bold"
            >
              {"$ " +
                assetPriceInDai?.toUnsafeFloat().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }) ?? " "}
            </Text>
          </Flex>
        </Flex>
        <Flex
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", lg: "center" }}
          justifyContent="flex-start"
          flexDirection={{ base: "column", lg: "row" }}
        >
          <Text
            fontSize={{ base: fontSizes.sm, md: fontSizes.md }}
            mr={{ base: "0rem", md: "1rem" }}
          >
            {isSmallerThan900 ? "Liquidity" : "Available Liquidity"}
          </Text>
          <Box fontSize={{ base: fontSizes.md, md: fontSizes.lg }}>
            <Text display="inline-block" fontWeight="bold" fontSize="inherit">
              {bigNumberToString(liquidityAvailable)}
            </Text>
          </Box>
        </Flex>
        <Flex
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", lg: "center" }}
          justifyContent="flex-start"
          flexDirection={{ base: "column", lg: "row" }}
        >
          <Text
            fontSize={{ base: fontSizes.sm, md: fontSizes.md }}
            mr={{ base: "0rem", md: "1rem" }}
          >
            {isSmallerThan900 ? "Utilization" : "Utilization Rate"}
          </Text>
          <Box fontSize={{ base: fontSizes.md, md: fontSizes.lg }}>
            <Text display="inline-block" fontWeight="bold" fontSize="inherit">
              {fixedNumberToPercentage(utilizationRate, 2)}%
            </Text>
          </Box>
        </Flex>
        <Flex
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", lg: "center" }}
          justifyContent="flex-start"
          flexDirection={{ base: "column", lg: "row" }}
        >
          <Text
            fontSize={{ base: fontSizes.sm, md: fontSizes.md }}
            mr={{ base: "0rem", md: "1rem" }}
          >
            {isSmallerThan900 ? "Variable APR" : "Variable APR"}
          </Text>
          <Box fontSize={{ base: fontSizes.md, md: fontSizes.lg }}>
            <Text display="inline-block" fontWeight="bold" fontSize="inherit">
              {fixedNumberToPercentage(variableBorrowAPR, 4, 2)}%
            </Text>
          </Box>
        </Flex>
      </Flex>
      <Flex
        w="100%"
        py={{ base: "2rem", md: "2.4rem" }}
        px={{ base: "1rem", md: "2.4rem" }}
        justifyContent="space-between"
      >
        <Flex
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", md: "center" }}
          justifyContent="flex-start"
          flexDirection="column"
        >
          <Text
            fontSize={{ base: fontSizes.sm, md: fontSizes.md }}
            pr="1rem"
            mb="0.5em"
          >
            You Borrowed
          </Text>
          <Box fontSize={{ base: fontSizes.md, md: fontSizes.lg }}>
            <Text display="inline-block" fontWeight="bold" fontSize="inherit">
              {bigNumberToString(
                userStableDebt
                  ? userVariableDebt?.add(userStableDebt)
                  : userVariableDebt,
                3
              )}
            </Text>
            {isSmallerThan400 ? null : " " + token.symbol}
          </Box>
        </Flex>
        <Flex
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", md: "center" }}
          justifyContent="flex-start"
          flexDirection="column"
        >
          <HStack pr={{ base: "0rem", md: "1rem" }} mb="0.5em">
            <Text fontSize={{ base: fontSizes.sm, md: fontSizes.md }}>
              Health Factor
            </Text>
          </HStack>
          <HStack pr={{ base: "0rem", md: "1rem" }} textAlign="center" w="100%">
            <ColoredText
              minW={{ base: "30px", md: "100%" }}
              fontSize={{ base: fontSizes.md, md: fontSizes.lg }}
              fontWeight="bold"
            >
              {bigNumberToString(healthFactor)}
            </ColoredText>
          </HStack>
        </Flex>
        <Flex
          h="100%"
          spacing={spacings.md}
          mr={{ base: "0rem", md: "1rem" }}
          alignItems={{ base: "flex-start", md: "center" }}
          justifyContent="flex-start"
          flexDirection="column"
        >
          <HStack pr={{ base: "0rem", md: "1rem" }} mb="0.5em">
            <Text fontSize={{ base: fontSizes.sm, md: fontSizes.md }}>
              Your Collateral
            </Text>
          </HStack>
          <HStack pr={{ base: "0rem", md: "1rem" }} textAlign="center">
            <Text
              fontSize={{ base: fontSizes.md, md: fontSizes.lg }}
              fontWeight="bold"
              minW={{ base: "30px", md: "100%" }}
            >
              $ {bigNumberToString(totalCollateralEth)}
            </Text>
          </HStack>
        </Flex>

        {isSmallerThan900 ? null : (
          <CollateralComposition
            allUserReservesData={allUserReservesData}
            totalCollateralValue={totalCollateralValue}
            allUserReservesBalances={allUserReservesBalances}
          ></CollateralComposition>
        )}
      </Flex>
    </VStack>
  );
};

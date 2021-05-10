import { Erc20abi__factory, StakedToken__factory } from "../../contracts";
import { getChainAddresses } from "../../utils/chainAddresses";
import { Account, ChainId } from "../../utils/queryBuilder";
import { useMutation, useQueryClient, UseMutationResult } from "react-query";
import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";
import React from "react";
import {
  useAmountAvailableToStake,
  useAmountStakedBy,
  useStakingCooldown,
  useStakingEvents,
  useTotalStakedForAllUsers,
} from "./queries";
import {
  ReactNotificationOptions,
  store as NotificationManager,
} from "react-notifications-component";

export interface StakeMutationProps {
  chainId: ChainId | undefined;
  address: Account | undefined;
}

export interface StakeMutationArgs {
  amount: BigNumber;
  library: JsonRpcProvider;
}

export interface StakeMutationResult {
  txHash: string;
}

export interface StakeMutationDto
  extends UseMutationResult<
    StakeMutationResult | undefined,
    unknown,
    StakeMutationArgs,
    unknown
  > {
  key: readonly [ChainId | undefined, Account | undefined];
}

async function usingProgressNotification<T>(
  title: string,
  message: string,
  notificationType: ReactNotificationOptions["type"],
  promise: Promise<T>
): Promise<T> {
  const notification = NotificationManager.addNotification({
    container: "bottom-center",
    title: title,
    dismiss: {
      click: false,
      touch: false,
      duration: 0,
    },
    message: message,
    type: notificationType,
  });
  try {
    return await promise;
  } finally {
    NotificationManager.removeNotification(notification);
  }
}

export const useStakeMutation = ({
  chainId,
  address,
}: StakeMutationProps): StakeMutationDto => {
  const queryClient = useQueryClient();
  const mutationKey = React.useMemo(() => [chainId, address] as const, [
    chainId,
    address,
  ]);

  const mutation = useMutation<
    StakeMutationResult | undefined,
    unknown,
    StakeMutationArgs,
    unknown
  >(
    mutationKey,
    async (args): Promise<StakeMutationResult | undefined> => {
      const chainAddrs = chainId ? getChainAddresses(chainId) : undefined;
      if (
        chainId === undefined ||
        address === undefined ||
        chainAddrs === undefined
      ) {
        return undefined;
      }
      const signer = args.library.getSigner();
      const stakingContract = StakedToken__factory.connect(
        chainAddrs.staking,
        signer
      );
      const stakedToken = await stakingContract
        .STAKED_TOKEN()
        .then(stakedTokenAddr =>
          Erc20abi__factory.connect(stakedTokenAddr, signer)
        );
      if (
        (await stakedToken.allowance(address, stakingContract.address)).lt(
          args.amount
        )
      ) {
        const approval = stakedToken.approve(
          stakingContract.address,
          args.amount
        );
        const approvalConfirmation = await usingProgressNotification(
          "Awaiting spend approval",
          "Please commit the transaction for ERC20 approval for the requested staking cost with your wallet.",
          "info",
          approval
        );
        await usingProgressNotification(
          "Awaiting approval confirmation",
          "Please wait while the blockchain processes your transaction",
          "info",
          approvalConfirmation.wait()
        );
      }
      console.log(
        "useStakeMutation",
        "attempting to stake",
        args.amount.toString()
      );
      const stakingRequest = stakingContract.stake(address, args.amount);
      const stakingConfirmation = await usingProgressNotification(
        "Awaiting stake transaction approval",
        "Please commit the staking transaction with your wallet.",
        "info",
        stakingRequest
      );
      const stakingReceipt = await usingProgressNotification(
        "Awaiting staking confirmation",
        "Please wait while the blockchain processes your transaction",
        "success",
        stakingConfirmation.wait()
      );
      return stakingReceipt.status &&
        stakingReceipt.events?.some(ev => ev.event === "Staked")
        ? { txHash: stakingReceipt.transactionHash }
        : undefined;
    },
    {
      useErrorBoundary: false,
      retry: false,
      onSuccess: async (_output, _vars, _context) => {
        const clearanceTasks = [
          queryClient.invalidateQueries(mutationKey, {
            exact: true,
            active: false,
            inactive: true,
            refetchInactive: false,
            refetchActive: false,
          }),
        ];
        if (address !== undefined) {
          const amountAvailableKey = useAmountAvailableToStake.buildKey(
            chainId,
            address,
            address
          );
          clearanceTasks.push(
            queryClient.invalidateQueries(amountAvailableKey)
          );
          const amountStakedKey = useAmountStakedBy.buildKey(
            chainId,
            address,
            address
          );
          clearanceTasks.push(queryClient.invalidateQueries(amountStakedKey));
        }
        const totalAmountStakedKey = useTotalStakedForAllUsers.buildKey(
          chainId,
          address
        );
        clearanceTasks.push(
          queryClient.invalidateQueries(totalAmountStakedKey)
        );
        await Promise.allSettled(clearanceTasks);
      },
      onError: async (_err, _vars, _context) => {
        await queryClient.invalidateQueries(mutationKey);
      },
    }
  );

  return React.useMemo(() => ({ ...mutation, key: mutationKey }), [
    mutation,
    mutationKey,
  ]);
};

export interface CooldownMutationProps {
  chainId: ChainId | undefined;
  address: Account | undefined;
}

export interface CooldownMutationArgs {
  library: JsonRpcProvider;
}

export interface CooldownMutationResult {
  txHash: string;
}

export interface CooldownMutationDto
  extends UseMutationResult<
    CooldownMutationResult | undefined,
    unknown,
    CooldownMutationArgs,
    unknown
  > {
  key: readonly [ChainId | undefined, Account | undefined];
}

export const useCooldownMutation = ({
  chainId,
  address,
}: CooldownMutationProps): CooldownMutationDto => {
  const queryClient = useQueryClient();
  const mutationKey = React.useMemo(() => [chainId, address] as const, [
    chainId,
    address,
  ]);

  const mutation = useMutation<
    CooldownMutationResult | undefined,
    unknown,
    CooldownMutationArgs,
    unknown
  >(
    mutationKey,
    async (args): Promise<CooldownMutationResult | undefined> => {
      const chainAddrs = chainId ? getChainAddresses(chainId) : undefined;
      if (
        chainId === undefined ||
        address === undefined ||
        chainAddrs === undefined
      ) {
        return undefined;
      }
      const signer = args.library.getSigner();
      const stakingContract = StakedToken__factory.connect(
        chainAddrs.staking,
        signer
      );
      console.log("useCooldownMutation", "attempting to start cooldown");
      const cooldownRequest = stakingContract.cooldown();
      const cooldownConfirmation = await usingProgressNotification(
        "Awaiting cooldown transaction approval",
        "Please commit the cooldown transaction with your wallet.",
        "info",
        cooldownRequest
      );
      const cooldownReceipt = await usingProgressNotification(
        "Awaiting cooldown transaction confirmation",
        "Please wait while the blockchain processes your transaction",
        "success",
        cooldownConfirmation.wait()
      );
      return cooldownReceipt.status &&
        cooldownReceipt.events?.some(ev => ev.event === "Cooldown")
        ? { txHash: cooldownReceipt.transactionHash }
        : undefined;
    },
    {
      useErrorBoundary: false,
      retry: false,
      onSuccess: async (_output, _vars, _context) => {
        const clearanceTasks = [
          queryClient.invalidateQueries(mutationKey, {
            exact: true,
            active: false,
            inactive: true,
            refetchInactive: false,
            refetchActive: false,
          }),
        ];
        const currentCooldownKey = useStakingEvents.buildKey(
          chainId,
          address,
          address
        );
        clearanceTasks.push(queryClient.invalidateQueries(currentCooldownKey));
        const cooldownKey = useStakingCooldown.buildKey(chainId, address);
        clearanceTasks.push(queryClient.invalidateQueries(cooldownKey));
        await Promise.allSettled(clearanceTasks);
      },
      onError: async (_err, _vars, _context) => {
        await queryClient.invalidateQueries(mutationKey);
      },
    }
  );

  return React.useMemo(() => ({ ...mutation, key: mutationKey }), [
    mutation,
    mutationKey,
  ]);
};
import { TransactionArgument } from '@mysten/sui/transactions';
import { BigintIsh } from '../../core';

export interface PlaceOrderArgs {
  amountIn?: BigintIsh;
  amountOutExpected: BigintIsh;
  expiredTimestamp: number;
  allowedPartialFills?: boolean; //default true
}
export type CancelOrderArgs = OrderArgs;

export interface TakeOrderArgs {
  orderId: BigintIsh;
  amount: BigintIsh;
}

export interface FillOrderArgs {
  receipt: TransactionArgument;
  filled: TransactionArgument;
}

export interface QueryOrderArgs {
  owner: string;
  limit: number;
  cursor?: number;
  desc?: boolean;
}

export interface OrderArgs {
  orderId: BigintIsh;
}

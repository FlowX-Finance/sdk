import { Transaction, TransactionResult } from '@mysten/sui/transactions';

export interface IMetaCapacityCreator {
  createDepositCap(
    coinIn: string,
    config: any
  ): (tx: Transaction) => TransactionResult;

  createWithdrawCap(
    coinOut: string,
    config: any
  ): (tx: Transaction) => TransactionResult;
}

import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { CONFIGS, MODULE_I32 } from './constants';
import { NETWORK } from '../core';

export class I32 {
  constructor(public readonly network: NETWORK = 'mainnet') {}

  public create(value: number, tx: Transaction): TransactionResult {
    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::${MODULE_I32}::${
        value >= 0 ? `from` : `neg_from`
      }`,
      arguments: [tx.pure.u32(Math.abs(value))],
    });
  }
}

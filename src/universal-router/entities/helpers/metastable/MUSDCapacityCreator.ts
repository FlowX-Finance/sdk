import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import invariant from 'tiny-invariant';

import { IMetaCapacityCreator } from './IMetaCapicityCreator';

export class MUSDCapacityCreator implements IMetaCapacityCreator {
  createDepositCap =
    (coinIn: string, config: any) =>
    (tx: Transaction): TransactionResult => {
      const { mUSDVault, oracles, pythMap } = config;
      const priceId = pythMap[oracles?.[0]?.priceId];
      invariant(priceId, 'priceId not found');

      return tx.moveCall({
        target: `${mUSDVault.metaVaultIntegrationPackageId}::pyth::create_deposit_cap`,
        typeArguments: [mUSDVault.metaCoinType, coinIn],
        arguments: [
          tx.object(mUSDVault.metaVaultIntegrationObjectId),
          tx.object(mUSDVault.vaultId),
          tx.object(priceId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };

  createWithdrawCap =
    (coinOut: string, config: any) =>
    (tx: Transaction): TransactionResult => {
      const { mUSDVault, oracles, pythMap } = config;
      const priceId = pythMap[oracles?.[0]?.priceId];
      invariant(priceId, 'priceId not found');

      return tx.moveCall({
        target: `${mUSDVault.metaVaultIntegrationPackageId}::pyth::create_withdraw_cap`,
        typeArguments: [mUSDVault.metaCoinType, coinOut],
        arguments: [
          tx.object(mUSDVault.metaVaultIntegrationObjectId),
          tx.object(mUSDVault.vaultId),
          tx.object(priceId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

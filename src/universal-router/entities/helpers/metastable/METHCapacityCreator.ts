import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import invariant from 'tiny-invariant';

import { IMetaCapacityCreator } from './IMetaCapicityCreator';

export class METHCapacityCreator implements IMetaCapacityCreator {
  createDepositCap =
    (coinIn: string, config: any) =>
    (tx: Transaction): TransactionResult => {
      const { mETHVault, oracles, pythMap } = config;
      const [coinInPriceId, metaCoinPriceId] = [
        pythMap[oracles?.[0]?.priceId],
        pythMap[oracles?.[1]?.priceId],
      ];
      invariant(coinInPriceId && metaCoinPriceId, 'priceIds not found');

      return tx.moveCall({
        target: `${mETHVault.metaVaultIntegrationPackageId}::pyth::create_deposit_cap`,
        typeArguments: [mETHVault.metaCoinType, coinIn],
        arguments: [
          tx.object(mETHVault.metaVaultIntegrationObjectId),
          tx.object(mETHVault.vaultId),
          tx.object(coinInPriceId),
          tx.object(metaCoinPriceId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };

  createWithdrawCap =
    (coinOut: string, config: any) =>
    (tx: Transaction): TransactionResult => {
      const { mETHVault, oracles, pythMap } = config;
      const [metaCoinPriceId, coinOutPriceId] = [
        pythMap[oracles?.[0]?.priceId],
        pythMap[oracles?.[1]?.priceId],
      ];
      invariant(coinOutPriceId && metaCoinPriceId, 'priceIds not found');

      return tx.moveCall({
        target: `${mETHVault.metaVaultIntegrationPackageId}::pyth::create_withdraw_cap`,
        typeArguments: [mETHVault.metaCoinType, coinOut],
        arguments: [
          tx.object(mETHVault.metaVaultIntegrationObjectId),
          tx.object(mETHVault.vaultId),
          tx.object(coinOutPriceId),
          tx.object(metaCoinPriceId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

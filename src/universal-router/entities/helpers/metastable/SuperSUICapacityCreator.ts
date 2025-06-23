import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import invariant from 'tiny-invariant';

import { IMetaCapacityCreator } from './IMetaCapicityCreator';

const UNIVERSAL_META_VAULT_INTEGRATION_PACKAGE_ID =
  '0xfd12517a9fc87c6a1f2357ad13b3421fb27a8bd7ca07d5fd5934ac35733baa47';

export class SuperSUICapacityCreator implements IMetaCapacityCreator {
  createDepositCap =
    (coinIn: string, config: any) =>
    (tx: Transaction): TransactionResult => {
      const { superSUIVault } = config;
      const metaVaultIntegrationPackageId =
        superSUIVault.mappingMetaVaultIntegrationPackageId[coinIn] ||
        superSUIVault.defaultMetaVaultIntegrationPackageId;
      const metaVaultIntegrationObjectId =
        superSUIVault.mappingMetaVaultIntegrationObjectId[coinIn] ||
        superSUIVault.defaultMetaVaultIntegrationObjectId;
      invariant(
        metaVaultIntegrationPackageId && metaVaultIntegrationObjectId,
        'invalid meta vault'
      );

      return tx.moveCall({
        target: `${metaVaultIntegrationPackageId}::exchange_rate::create_deposit_cap`,
        typeArguments:
          metaVaultIntegrationPackageId ===
          UNIVERSAL_META_VAULT_INTEGRATION_PACKAGE_ID
            ? [superSUIVault.metaCoinType, coinIn]
            : [superSUIVault.metaCoinType],
        arguments: [
          tx.object(metaVaultIntegrationObjectId),
          tx.object(superSUIVault.vaultId),
          tx.object(superSUIVault.exchangeRateRegistryObjectId),
        ],
      });
    };

  createWithdrawCap =
    (coinOut: string, config: any) =>
    (tx: Transaction): TransactionResult => {
      const { superSUIVault } = config;
      const metaVaultIntegrationPackageId =
        superSUIVault.mappingMetaVaultIntegrationPackageId[coinOut] ||
        superSUIVault.defaultMetaVaultIntegrationPackageId;
      const metaVaultIntegrationObjectId =
        superSUIVault.mappingMetaVaultIntegrationObjectId[coinOut] ||
        superSUIVault.defaultMetaVaultIntegrationObjectId;
      invariant(
        metaVaultIntegrationPackageId && metaVaultIntegrationObjectId,
        'invalid meta vault'
      );

      return tx.moveCall({
        target: `${metaVaultIntegrationPackageId}::exchange_rate::create_withdraw_cap`,
        typeArguments:
          metaVaultIntegrationPackageId ===
          UNIVERSAL_META_VAULT_INTEGRATION_PACKAGE_ID
            ? [superSUIVault.metaCoinType, coinOut]
            : [superSUIVault.metaCoinType],
        arguments: [
          tx.object(metaVaultIntegrationObjectId),
          tx.object(superSUIVault.vaultId),
          tx.object(superSUIVault.exchangeRateRegistryObjectId),
        ],
      });
    };
}

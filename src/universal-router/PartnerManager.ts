import { isNil } from 'lodash';
import invariant from 'tiny-invariant';

import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';

import {
  Coin,
  CoinAmount,
  getAllDynamicFields,
  multiGetObjects,
  NETWORK,
  PromiseAll,
} from '../core';
import { CONFIGS } from './constants';

interface PartnerManagerConstructorArgs {
  network: NETWORK;
  client?: SuiClient;
}

interface GetCommissionAmountsOptions {
  address: string;
  coins?: Coin[];
}

interface WithdrawnCommissionsOptions extends GetCommissionAmountsOptions {
  recipient: string;
}

export class PartnerManager {
  private readonly network: NETWORK;
  private readonly client: SuiClient;

  private partnersParentId: string;
  private mappingPartnerBalancesParentId: Record<string, string> = {};

  constructor({ network, client }: PartnerManagerConstructorArgs) {
    this.network = network;
    this.client =
      client ??
      new SuiClient({
        url: getFullnodeUrl(network),
      });
  }

  async getPartnersBalanceParentId(address: string) {
    if (!this.partnersParentId) {
      const partnerRegistryObjectId =
        CONFIGS[this.network].partnerRegistryObjectId;
      const partnerRegistryObject: any = await this.client.getObject({
        id: partnerRegistryObjectId,
        options: {
          showType: true,
          showContent: true,
        },
      });

      invariant(
        !partnerRegistryObject.error,
        `PartnerRegistry object not found with ID=${partnerRegistryObjectId}`
      );

      this.partnersParentId =
        partnerRegistryObject.data.content.fields.partners.fields.id.id;
    }

    if (!this.mappingPartnerBalancesParentId[address]) {
      const df: any = await this.client.getDynamicFieldObject({
        parentId: this.partnersParentId,
        name: {
          type: 'address',
          value: address,
        },
      });

      if (!df.error) {
        this.mappingPartnerBalancesParentId[address] =
          df.data.content.fields.value.fields.balances.fields.id.id;
      }
    }

    return this.mappingPartnerBalancesParentId[address];
  }

  async getCommissionAmounts({ address, coins }: GetCommissionAmountsOptions) {
    const isAll = isNil(coins);

    const partnerBalancesParentId = await this.getPartnersBalanceParentId(
      address
    );

    if (!partnerBalancesParentId) {
      return [];
    }

    if (isAll) {
      const dfs = await getAllDynamicFields(
        partnerBalancesParentId,
        this.client
      );
      const dfObjectIds = dfs.map((df) => df.objectId);
      const dfObjects: any[] = await multiGetObjects(this.client, dfObjectIds, {
        showType: true,
        showContent: true,
      });

      return dfObjects
        .filter((df) => df.content.fields.value != '0')
        .map((df) =>
          CoinAmount.fromRawAmount(
            new Coin(normalizeStructTag(df.content.fields.name.fields.name)),
            df.content.fields.value
          )
        );
    } else {
      const dfObjects: any[] = await PromiseAll(
        coins.map((coin) =>
          this.client.getDynamicFieldObject({
            parentId: partnerBalancesParentId,
            name: {
              type: '0x1::type_name::TypeName',
              value: {
                name: coin.coinType.replace('0x', ''),
              },
            },
          })
        )
      );

      return dfObjects
        .filter((df) => df.data.content.fields.value != '0')
        .map((df) =>
          CoinAmount.fromRawAmount(
            new Coin(
              normalizeStructTag(df.data.content.fields.name.fields.name)
            ),
            df.data.content.fields.value
          )
        );
    }
  }

  withdrawCommissions =
    ({ address, coins, recipient }: WithdrawnCommissionsOptions) =>
    async (tx = new Transaction()) => {
      const commissionAmounts = await this.getCommissionAmounts({
        address,
        coins,
      });

      if (commissionAmounts.length > 0) {
        const { packageId, partnerRegistryObjectId, versionedObjectId } =
          CONFIGS[this.network];

        commissionAmounts.forEach((commissionAmount) => {
          tx.moveCall({
            target: `${packageId}::partner_manager::withdraw`,
            typeArguments: [commissionAmount.coin.coinType],
            arguments: [
              tx.object(partnerRegistryObjectId),
              tx.pure.u64(commissionAmount.quotient.toString()),
              tx.pure.address(recipient),
              tx.object(versionedObjectId),
            ],
          });
        });
      }

      return tx;
    };
}

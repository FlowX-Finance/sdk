import invariant from 'tiny-invariant';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID, normalizeStructTag } from '@mysten/sui/utils';

import { Coin, fetchCoin, NETWORK, TxBuilder } from '../core';
import { CONFIGS, FeeAmount, MODULE_POOL_MANAGER } from './constants';
import { ClmmPool, TickOnchainDataProvider } from './entities';
import { ClmmPoolReward } from './entities/ClmmPoolReward';
import _ from 'lodash';
import { PoolRawData } from './types';

export class ClmmPoolManager extends TxBuilder {
  constructor(public override readonly network: NETWORK = 'mainnet') {
    super(network);
  }

  public createPool(pool: ClmmPool, tx: Transaction) {
    tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POOL_MANAGER}::create_and_initialize_pool`,
      typeArguments: [pool.coinX.coinType, pool.coinY.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].poolRegistryObject),
        tx.pure.u64(pool.fee),
        tx.pure.u128(pool.sqrtPriceX64.toString()),
        tx.object(CONFIGS[this.network].versionObject),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  public async createPoolV2(pool: ClmmPool, tx: Transaction) {
    const [metadataX, metadataY] = await Promise.all([
      this._client
        .getCoinMetadata({
          coinType: pool.coinX.coinType,
        })
        .catch(() => null),
      this._client
        .getCoinMetadata({
          coinType: pool.coinY.coinType,
        })
        .catch(() => null),
    ]);
    invariant(
      metadataX && metadataY && metadataX.id && metadataY.id,
      'Failed to fetch coin metadata for pool coins'
    );

    tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POOL_MANAGER}::create_and_initialize_pool_v2`,
      typeArguments: [pool.coinX.coinType, pool.coinY.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].poolRegistryObject),
        tx.pure.u64(pool.fee),
        tx.pure.u128(pool.sqrtPriceX64.toString()),
        tx.object(metadataX.id),
        tx.object(metadataY.id),
        tx.object(CONFIGS[this.network].versionObject),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  public async getPoolDetail(poolId: string): Promise<ClmmPool> {
    const poolObject: any = await this._client.getObject({
      id: poolId,
      options: {
        showContent: true,
        showType: true,
      },
    });
    invariant(
      poolObject.data &&
        poolObject.data.type?.startsWith(`${CONFIGS[this.network].poolType}`),
      'invalid position'
    );

    const rawData = poolObject.data.content?.['fields'] as PoolRawData;
    const poolRewards = rawData.reward_infos.map(
      (reward: any) =>
        new ClmmPoolReward(
          new Coin(reward.fields.reward_coin_type.fields.name),
          Number(reward.fields.ended_at_seconds),
          reward.fields.reward_per_seconds,
          reward.fields.total_reward,
          Number(reward.fields.last_update_time),
          reward.fields.reward_growth_global
        )
    );
    const poolCoins = await Promise.all([
      fetchCoin(normalizeStructTag(rawData.coin_type_x.fields.name))(
        this._client
      ),
      fetchCoin(normalizeStructTag(rawData.coin_type_y.fields.name))(
        this._client
      ),
    ]);

    return new ClmmPool(
      poolObject.data.objectId,
      poolCoins,
      poolRewards,
      [rawData.reserve_x, rawData.reserve_y],
      parseInt(rawData.swap_fee_rate) as FeeAmount,
      rawData.sqrt_price,
      Number(BigInt.asIntN(32, BigInt(rawData.tick_index.fields.bits))),
      rawData.liquidity,
      rawData.fee_growth_global_x,
      rawData.fee_growth_global_y,
      new TickOnchainDataProvider({
        network: this.network,
        tickManagerId: rawData.ticks.fields.id.id,
      })
    );
  }

  public async getPoolDetails(poolIds: string[]): Promise<ClmmPool[]> {
    return (await this.getMultipleIds(_.uniq(poolIds))).map((pool: any) => {
      const poolCoins = [
        new Coin(
          normalizeStructTag(pool.data.content.fields.coin_type_x.fields.name)
        ),
        new Coin(
          normalizeStructTag(pool.data.content.fields.coin_type_y.fields.name)
        ),
      ];

      const poolRewards = pool.data.content.fields.reward_infos.map(
        (reward: any) =>
          new ClmmPoolReward(
            new Coin(reward.fields.reward_coin_type.fields.name),
            Number(reward.fields.ended_at_seconds),
            reward.fields.reward_per_seconds,
            reward.fields.total_reward,
            Number(reward.fields.last_update_time),
            reward.fields.reward_growth_global
          )
      );

      return new ClmmPool(
        pool.data.objectId,
        poolCoins,
        poolRewards,
        [
          pool.data.content.fields.reserve_x,
          pool.data.content.fields.reserve_y,
        ],
        parseInt(pool.data.content.fields.swap_fee_rate) as FeeAmount,
        pool.data.content.fields.sqrt_price,
        Number(
          BigInt.asIntN(
            32,
            pool.data.content.fields.tick_index.fields.bits.toString()
          )
        ),
        pool.data.content.fields.liquidity,
        pool.data.content.fields.fee_growth_global_x,
        pool.data.content.fields.fee_growth_global_y,
        new TickOnchainDataProvider({
          network: this.network,
          tickManagerId: pool.data.content.fields.ticks.fields.id.id,
        })
      );
    });
  }

  public async getPools(): Promise<ClmmPool[]> {
    const dynamicDatas = await this.getFullyDynamicFields(
      CONFIGS[this.network].poolRegistryObject
    );
    const poolObjectIds = dynamicDatas.map((it) => it.objectId);

    return this.getPoolDetails(poolObjectIds);
  }
}

import invariant from 'tiny-invariant';
import pLimit from 'p-limit';
import { chunk, uniq } from 'lodash';

import { normalizeStructTag, parseStructTag } from '@mysten/sui/utils';

import {
  Coin,
  DEFAULT_CACHE_EXPIRATION_TIME_SECONDS,
  DEFAULT_CONCURRENCY,
  getAllDynamicFields,
  MAX_OBJECTS_PER_QUERY,
  multiGetObjects,
  NETWORK,
  TxBuilder,
} from '../core';
import { MAPPING_POOL_REGISTRY_OBJECT_ID } from './constants';
import { FaaSPool } from './entities';
import {
  AmmPoolManager as LiquidityPoolManager,
  AmmPool as LiquidityPool,
} from '../amm';
import { sdkCache } from '../core';

const limit = pLimit(DEFAULT_CONCURRENCY);

export class FaaSPoolManager extends TxBuilder {
  private readonly liquidityPoolManager: LiquidityPoolManager;

  constructor(network: NETWORK) {
    super(network);
    this.liquidityPoolManager = new LiquidityPoolManager(network);
  }

  private async getLiquidityPool(coinX: Coin, coinY: Coin) {
    const liquidityPoolId = LiquidityPool.getPoolIdentifier(coinX, coinY);
    const cached = sdkCache.get(liquidityPoolId);

    if (cached) {
      return cached as LiquidityPool;
    }

    const liquidityPool = await this.liquidityPoolManager.getPool({
      coinX,
      coinY,
    });
    sdkCache.set(
      liquidityPoolId,
      liquidityPool,
      DEFAULT_CACHE_EXPIRATION_TIME_SECONDS
    );

    return liquidityPool;
  }

  private async multiGetLiquidityPools(params: { coinX: Coin; coinY: Coin }[]) {
    const poolIds = uniq(
      params.map((param) =>
        LiquidityPool.getPoolIdentifier(param.coinX, param.coinY)
      )
    );

    const cached = sdkCache.mget<LiquidityPool>(poolIds);

    const missingKeys = poolIds.filter((poolId) => !cached[poolId]);

    const batches = chunk(missingKeys, MAX_OBJECTS_PER_QUERY);
    const missingPools = (
      await Promise.all(
        batches.map((batch) =>
          limit(() =>
            this.liquidityPoolManager.multiGetPools(
              batch.map((it) => {
                const [, coinX, coinY] = it.split('-');
                return {
                  coinX: new Coin(normalizeStructTag(coinX)),
                  coinY: new Coin(normalizeStructTag(coinY)),
                };
              })
            )
          )
        )
      )
    ).flat();

    sdkCache.mset(
      missingPools.map((pool) => ({
        key: LiquidityPool.getPoolIdentifier(pool.coinX, pool.coinY),
        val: pool,
        ttl: DEFAULT_CACHE_EXPIRATION_TIME_SECONDS,
      }))
    );

    return missingPools.concat(Object.values(cached).filter((it) => it));
  }

  async getPool(poolIndex: number) {
    const poolDf: any = await this._client.getDynamicFieldObject({
      parentId: MAPPING_POOL_REGISTRY_OBJECT_ID[this.network],
      name: {
        type: 'u64',
        value: poolIndex.toString(),
      },
    });

    invariant(!poolDf.error, 'Get FAAS pool failed');

    const { typeParams } = parseStructTag(
      poolDf.data?.content?.['fields'].value.type
    );

    const liquidityPool = await this.getLiquidityPool(
      new Coin(normalizeStructTag(typeParams[0])),
      new Coin(normalizeStructTag(typeParams[1]))
    );

    const {
      id,
      token_per_seconds,
      flx_per_seconds,
      acc_token_per_share,
      acc_flx_per_share,
      started_at_ms,
      ended_at_ms,
      last_reward_at_ms,
      creator,
      is_emergency,
      lp_custodian,
      flx_custodian,
      reward_token_custodian,
    } = poolDf.data?.content?.['fields'].value.fields || {};

    return new FaaSPool({
      objectId: poolDf.data.objectId,
      poolIndex: poolIndex,
      tokenRewardType: normalizeStructTag(
        parseStructTag(reward_token_custodian.type).typeParams[0]
      ),
      flxTokenType: normalizeStructTag(
        parseStructTag(flx_custodian.type).typeParams[0]
      ),
      tokenRewardPerSec: token_per_seconds,
      flxRewardPerSec: flx_per_seconds,
      accTokenRewardPerSec: acc_token_per_share,
      accFlxRewardPerSec: acc_flx_per_share,
      startingTimestampMs: Number(started_at_ms),
      closingTimestampMs: Number(ended_at_ms),
      lastRewardAtMs: Number(last_reward_at_ms),
      creator: creator,
      isEmergency: is_emergency,
      liquidityPool,
      totalLiquidityCoinStaked: lp_custodian.fields.reserve,
    });
  }

  async multiGetPools(poolIndexes: number[]) {
    invariant(
      poolIndexes.length < MAX_OBJECTS_PER_QUERY,
      'Exceeded limit per query'
    );

    return Promise.all(
      uniq(poolIndexes).map((poolIndex) => limit(() => this.getPool(poolIndex)))
    );
  }

  async getAllPools() {
    const poolDynamicFields = await getAllDynamicFields(
      MAPPING_POOL_REGISTRY_OBJECT_ID[this.network],
      this._client
    );

    const poolDynamicFieldIds = poolDynamicFields.map((df) => df.objectId);
    const poolObjects: any = await multiGetObjects(
      this._client,
      poolDynamicFieldIds
    );

    const multiGetLiquidityPoolParams = poolObjects.map((poolObject: any) => {
      const { typeParams } = parseStructTag(
        poolObject?.content?.['fields'].value.type
      );

      const [coinX, coinY] = [
        new Coin(normalizeStructTag(typeParams[0])),
        new Coin(normalizeStructTag(typeParams[1])),
      ];

      return {
        coinX,
        coinY,
      };
    });
    const liquidityPools = await this.multiGetLiquidityPools(
      multiGetLiquidityPoolParams
    );

    const mappingLiquidityPools = liquidityPools.reduce(
      (memo: any, liquidityPool) => {
        memo[
          LiquidityPool.getPoolIdentifier(
            liquidityPool.coinX,
            liquidityPool.coinY
          )
        ] = liquidityPool;
        return memo;
      },
      {}
    );

    const pools: FaaSPool[] = poolObjects.map((poolObject: any) => {
      const {
        id,
        token_per_seconds,
        flx_per_seconds,
        acc_token_per_share,
        acc_flx_per_share,
        started_at_ms,
        ended_at_ms,
        last_reward_at_ms,
        creator,
        is_emergency,
        lp_custodian,
        flx_custodian,
        reward_token_custodian,
      } = poolObject?.content?.['fields'].value.fields || {};

      const { typeParams } = parseStructTag(
        poolObject?.content?.['fields'].value.type
      );

      return new FaaSPool({
        objectId: id.id,
        poolIndex: Number(poolObject?.content?.['fields'].name || 0),
        tokenRewardType: normalizeStructTag(
          parseStructTag(reward_token_custodian.type).typeParams[0]
        ),
        flxTokenType: normalizeStructTag(
          parseStructTag(flx_custodian.type).typeParams[0]
        ),
        tokenRewardPerSec: token_per_seconds,
        flxRewardPerSec: flx_per_seconds,
        accTokenRewardPerSec: acc_token_per_share,
        accFlxRewardPerSec: acc_flx_per_share,
        startingTimestampMs: Number(started_at_ms),
        closingTimestampMs: Number(ended_at_ms),
        lastRewardAtMs: Number(last_reward_at_ms),
        creator: creator,
        isEmergency: is_emergency,
        liquidityPool:
          mappingLiquidityPools[
            LiquidityPool.getPoolIdentifier(
              new Coin(normalizeStructTag(typeParams[0])),
              new Coin(normalizeStructTag(typeParams[1]))
            )
          ],
        totalLiquidityCoinStaked: lp_custodian.fields.reserve,
      });
    });

    return pools.sort((a: any, b: any) => a.poolIndex - b.poolIndex);
  }
}

import { Transaction } from '@mysten/sui/transactions';
import {
  ADDRESS_ZERO,
  Coin,
  MAX_OBJECTS_DEV_INSPECT_PER_QUERY,
  TxBuilder,
} from '../core';
import {
  AMM_BAG_PAIRS_PARENT_ID,
  BPS,
  FACTORY_MODULE,
  MAPPING_CONTAINER_OBJECT_ID,
  MAPPING_PACKAGE_ID,
} from './constants';
import invariant from 'tiny-invariant';
import { PoolMetadataBcs } from './bcs/types';
import { AmmPool } from './entities/AmmPool';
import _ from 'lodash';

export class AmmPoolManager extends TxBuilder {
  invokeGetPool =
    (params: { coinX: Coin; coinY: Coin }) => (tx: Transaction) => {
      const [coinX, coinY] = params.coinX.sortsBefore(params.coinY)
        ? [params.coinX, params.coinY]
        : [params.coinY, params.coinX];
      tx.moveCall({
        target: `${
          MAPPING_PACKAGE_ID[this.network]
        }::${FACTORY_MODULE}::borrow_pair`,
        typeArguments: [coinX.coinType, coinY.coinType],
        arguments: [tx.object(MAPPING_CONTAINER_OBJECT_ID[this.network])],
      });
    };

  async getPool(params: { coinX: Coin; coinY: Coin }) {
    const tx = new Transaction();
    this.invokeGetPool(params)(tx);
    const resp = await this._client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: ADDRESS_ZERO,
    });

    invariant(
      resp.effects.status.status === 'success',
      resp.effects.status.error
    );

    const poolMetadata = PoolMetadataBcs.parse(
      new Uint8Array(resp?.results?.[0]?.returnValues?.[0]?.[0] || [])
    );

    return new AmmPool({
      objectId: poolMetadata.id,
      coins: [params.coinX, params.coinY],
      reserves: [poolMetadata.reserveX.value, poolMetadata.reserveY.value],
      feeRate: Number(poolMetadata.feeRate) / BPS,
      liquiditySupply: poolMetadata.lpSupply.value,
      kLast: poolMetadata.kLast,
    });
  }

  async multiGetPools(params: { coinX: Coin; coinY: Coin }[]) {
    invariant(
      params.length <= MAX_OBJECTS_DEV_INSPECT_PER_QUERY,
      'Exceeded limit per query'
    );

    const tx = new Transaction();

    for (const param of params) {
      this.invokeGetPool(param)(tx);
    }

    const resp = await this._client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: ADDRESS_ZERO,
    });

    invariant(
      resp.effects.status.status === 'success',
      resp.effects.status.error
    );

    const pools: AmmPool[] = [];
    for (const [idx, param] of params.entries()) {
      const poolMetadata = PoolMetadataBcs.parse(
        new Uint8Array(resp?.results?.[idx]?.returnValues?.[0]?.[0] || [])
      );

      pools.push(
        new AmmPool({
          objectId: poolMetadata.id,
          coins: [param.coinX, param.coinY],
          reserves: [poolMetadata.reserveX.value, poolMetadata.reserveY.value],
          feeRate: Number(poolMetadata.feeRate) / BPS,
          liquiditySupply: poolMetadata.lpSupply.value,
          kLast: poolMetadata.kLast,
        })
      );
    }

    return pools;
  }

  async getPools() {
    const dynamicFieldsPairs = await this.getFullyDynamicFields(
      AMM_BAG_PAIRS_PARENT_ID[this.network]
    );
    const pairCoinTypes: { coinX: Coin; coinY: Coin }[] =
      dynamicFieldsPairs.map((it: any) => {
        const data = it.name.value.split('-');

        return {
          coinX: new Coin(data[1]),
          coinY: new Coin(data[2]),
        };
      });

    const pairChunks = _.chunk(
      pairCoinTypes,
      MAX_OBJECTS_DEV_INSPECT_PER_QUERY
    );
    const result: AmmPool[] = [];
    for (let i = 0; i < pairChunks.length; i++) {
      result.push(...(await this.multiGetPools(pairChunks[i])));
    }

    return result;
  }
}

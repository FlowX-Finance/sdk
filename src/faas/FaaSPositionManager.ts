import { groupBy } from 'lodash';
import { getAllOwnedObjects, NETWORK, TxBuilder } from '../core';
import { MAPPING_POSITION_OBJECT_TYPE } from './constants';
import { FaaSPoolManager } from './FaaSPoolManager';
import { BN } from 'bn.js';
import { FaaSPosition } from './entities';

export class FaaSPositionManager extends TxBuilder {
  private readonly poolManager: FaaSPoolManager;

  constructor(public override network: NETWORK = 'mainnet') {
    super(network);
    this.poolManager = new FaaSPoolManager(network);
  }

  async getUserPositions(owner: string) {
    const ownedPositionObjects = await getAllOwnedObjects(
      {
        owner,
        objectType: MAPPING_POSITION_OBJECT_TYPE[this.network],
      },
      this._client
    );

    const validPositions = ownedPositionObjects
      .map((item: any) => ({ ...item.content?.['fields'] }))
      .filter((item: any) => !new BN(item.amount).isZero());
    const poolIndexes = validPositions.map((pos) => Number(pos.pool_idx));

    const pools = await this.poolManager.multiGetPools(poolIndexes);
    return validPositions.map(
      (pos) =>
        new FaaSPosition({
          objectId: pos.id.id,
          owner,
          liquidity: pos.amount,
          tokenRewardDebt: pos.token_reward_debt,
          flxRewardDebt: pos.flx_reward_debt,
          pool: pools.find((pool) => pool.poolIndex === Number(pos.pool_idx))!,
        })
    );
  }
}

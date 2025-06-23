import {
  normalizeStructTag,
  parseStructTag,
  SUI_CLOCK_OBJECT_ID,
  SUI_TYPE_ARG,
} from '@mysten/sui/utils';
import { coinWithBalance } from '@mysten/sui/transactions';

import {
  BigintIsh,
  Coin,
  MAX_OBJECTS_PER_QUERY,
  NETWORK,
  Percent,
  TxBuilder,
} from '../core';
import {
  MAPPING_CONTAINER_OBJECT_ID,
  MAPPING_PACKAGE_ID,
  MODULE_ROUTER,
} from './constants';
import { chunk } from 'lodash';
import { AmmPoolManager } from './AmmPoolManager';
import { AmmPosition } from './entities/AmmPosition';
import { AmmPool } from './entities/AmmPool';
import { BN } from 'bn.js';
import invariant from 'tiny-invariant';

interface IncreaseLiquidityOptions {
  amountX?: BigintIsh;
  amountY?: BigintIsh;
  slippageTolerance: Percent;
  deadline?: number;
}

interface DecreaseLiquidityOptions {
  slippageTolerance: Percent;
  deadline?: number;
}

export class AmmPositionManager extends TxBuilder {
  private readonly poolManager: AmmPoolManager;

  constructor(public override network: NETWORK = 'mainnet') {
    super(network);
    this.poolManager = new AmmPoolManager(network);
  }

  async getUserPositions(owner: string) {
    const allCoinBalance = await this._client.getAllBalances({
      owner: owner,
    });
    const liquidityCoins = allCoinBalance.filter((coin) =>
      coin.coinType.startsWith(`${MAPPING_PACKAGE_ID[this.network]}::pair::LP`)
    );

    const batches = chunk(liquidityCoins, MAX_OBJECTS_PER_QUERY);
    const pools = (
      await Promise.all(
        batches.map((batch) =>
          this.poolManager.multiGetPools(
            batch.map((item) => {
              const { typeParams } = parseStructTag(item.coinType);
              return {
                coinX: new Coin(normalizeStructTag(typeParams[0])),
                coinY: new Coin(normalizeStructTag(typeParams[1])),
              };
            })
          )
        )
      )
    ).flat();

    return liquidityCoins.map(
      (liquidityCoin, idx) =>
        new AmmPosition({
          owner: owner,
          pool: pools[idx],
          liquidity: liquidityCoin.totalBalance,
        })
    );
  }

  async increaseLiquidity(
    position: AmmPosition,
    options: IncreaseLiquidityOptions
  ) {
    const { amountX, amountY, slippageTolerance, deadline } = options;

    if (new BN(position.pool.liquiditySupply).isZero()) {
      invariant(amountX && amountY, 'AMOUNTS');
      position.mintAmounts = {
        amountX: new BN(amountX),
        amountY: new BN(amountY),
      };
    }

    const minimumAmounts = position.mintAmountsWithSlippage(slippageTolerance);

    const [coinXToAdd, coinYToAdd] = [
      coinWithBalance({
        balance: BigInt(position.mintAmounts.amountX.toString()),
        type: position.pool.coinX.coinType,
        useGasCoin: position.pool.coinX.coinType === SUI_TYPE_ARG,
      })(this._tx),
      coinWithBalance({
        balance: BigInt(position.mintAmounts.amountY.toString()),
        type: position.pool.coinY.coinType,
        useGasCoin: position.pool.coinY.coinType === SUI_TYPE_ARG,
      })(this._tx),
    ];

    return this._tx.moveCall({
      target: `${
        MAPPING_PACKAGE_ID[this.network]
      }::${MODULE_ROUTER}::add_liquidity`,
      typeArguments: [
        position.pool.coinX.coinType,
        position.pool.coinY.coinType,
      ],
      arguments: [
        this._tx.object(SUI_CLOCK_OBJECT_ID),
        this._tx.object(MAPPING_CONTAINER_OBJECT_ID[this.network]),
        coinXToAdd,
        coinYToAdd,
        this._tx.pure.u64(minimumAmounts.amountX.toString()),
        this._tx.pure.u64(minimumAmounts.amountY.toString()),
        this._tx.pure.address(position.owner),
        this._tx.pure.u64(deadline || Number.MAX_SAFE_INTEGER),
      ],
    });
  }

  async decreaseLiquidity(
    position: AmmPosition,
    options: DecreaseLiquidityOptions
  ) {
    const { slippageTolerance, deadline } = options;
    const minimumAmounts = position.burnAmountsWithSlippage(slippageTolerance);

    const liquidityCoinToRemove = coinWithBalance({
      type: AmmPool.getLiquidityCoinType(
        position.pool.coinX,
        position.pool.coinY,
        this.network
      ),
      balance: BigInt(position.liquidity.toString()),
      useGasCoin: false,
    })(this._tx);

    return this._tx.moveCall({
      target: `${
        MAPPING_PACKAGE_ID[this.network]
      }::${MODULE_ROUTER}::remove_liquidity`,
      typeArguments: [
        position.pool.coinX.coinType,
        position.pool.coinY.coinType,
      ],
      arguments: [
        this._tx.object(SUI_CLOCK_OBJECT_ID),
        this._tx.object(MAPPING_CONTAINER_OBJECT_ID[this.network]),
        liquidityCoinToRemove,
        this._tx.pure.u64(minimumAmounts.amountX.toString()),
        this._tx.pure.u64(minimumAmounts.amountY.toString()),
        this._tx.pure.address(position.owner),
        this._tx.pure.u64(deadline || Number.MAX_SAFE_INTEGER),
      ],
    });
  }
}

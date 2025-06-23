import {
  coinWithBalance,
  Transaction,
  TransactionArgument,
  TransactionResult,
} from '@mysten/sui/transactions';

import {
  BigintIsh,
  Coin,
  MaxUint64,
  NETWORK,
  Percent,
  TxBuilder,
} from '../core';
import { ClmmPool, ClmmPosition } from './entities';
import { ClmmPoolManager } from './ClmmPoolManager';
import { CONFIGS, FeeAmount, MODULE_POSITION_MANAGER } from './constants';
import { I32 } from './I32';
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_TYPE_ARG,
  isValidSuiAddress,
  normalizeStructTag,
} from '@mysten/sui/utils';
import { CoinAmount } from '../core/entities/CoinAmount';
import invariant from 'tiny-invariant';
import { PositionRawData } from './types';
import { chunk } from 'lodash';

export interface IncreaseLiquidityOptions {
  slippageTolerance: Percent;
  deadline: number;
  coinXIn?: TransactionArgument;
  coinYIn?: TransactionArgument;
  createPosition?: boolean;
}

export interface DecreaseLiquidityOptions {
  slippageTolerance: Percent;
  deadline: number;
  collectOptions?: CollectOptions;
}

export interface CollectOptions {
  expectedCoinOwedX: CoinAmount<Coin>;
  expectedCoinOwedY: CoinAmount<Coin>;
  recipient?: string;
}

export interface CollectPoolRewardOptions {
  expectedRewardOwed: CoinAmount<Coin>;
  recipient?: string;
}

export class ClmmPositionManager extends TxBuilder {
  private i32: I32;

  constructor(
    public override network: NETWORK = 'mainnet',
    public poolManager: ClmmPoolManager
  ) {
    super(network);
    this.i32 = new I32(this.network);
  }

  public openPosition(position: ClmmPosition): TransactionResult {
    const [tickLowerI32, tickUpperI32] = [
      this.i32.create(position.tickLower, this._tx),
      this.i32.create(position.tickUpper, this._tx),
    ];

    return this._tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POSITION_MANAGER}::open_position`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        this._tx.object(CONFIGS[this.network].positionRegistryObject),
        this._tx.object(CONFIGS[this.network].poolRegistryObject),
        this._tx.pure.u64(position.pool.fee),
        tickLowerI32,
        tickUpperI32,
        this._tx.object(CONFIGS[this.network].versionObject),
      ],
    });
  }

  closePosition(position: ClmmPosition) {
    this._tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POSITION_MANAGER}::close_position`,
      arguments: [
        this._tx.object(CONFIGS[this.network].positionRegistryObject),
        this._tx.object(position.id),
        this._tx.object(CONFIGS[this.network].versionObject),
      ],
    });
  }

  public increaseLiquidity(
    position: ClmmPosition,
    options: IncreaseLiquidityOptions
  ): TransactionResult | void {
    const { amountX: amountXDesired, amountY: amountYDesired } =
      position.mintAmounts;

    const minimumAmounts = position.mintAmountsWithSlippage(
      options.slippageTolerance
    );
    const amountXMin = minimumAmounts.amountX.toString();
    const amountYMin = minimumAmounts.amountY.toString();

    let positionObject: any;
    if (options.createPosition) {
      positionObject = this.openPosition(position);
    } else {
      positionObject = this._tx.object(position.id);
    }

    const [coinXIn, coinYIn] = [
      options.coinXIn ??
        coinWithBalance({
          type: position.amountX.coin.coinType,
          balance: BigInt(amountXDesired.toString()),
          useGasCoin:
            normalizeStructTag(SUI_TYPE_ARG) ===
            normalizeStructTag(position.amountX.coin.coinType),
        }),
      options.coinYIn ??
        coinWithBalance({
          type: position.amountY.coin.coinType,
          balance: BigInt(amountYDesired.toString()),
          useGasCoin:
            normalizeStructTag(SUI_TYPE_ARG) ===
            normalizeStructTag(position.amountY.coin.coinType),
        }),
    ];

    this._tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POSITION_MANAGER}::increase_liquidity`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        this._tx.object(CONFIGS[this.network].poolRegistryObject),
        positionObject,
        coinXIn,
        coinYIn,
        this._tx.pure.u64(amountXMin),
        this._tx.pure.u64(amountYMin),
        this._tx.pure.u64(options.deadline),
        this._tx.object(CONFIGS[this.network].versionObject),
        this._tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    if (options.createPosition) {
      return positionObject;
    }
  }

  public decreaseLiquidity(
    position: ClmmPosition,
    options: DecreaseLiquidityOptions
  ) {
    const minimumAmounts = position.burnAmountsWithSlippage(
      options.slippageTolerance
    );
    const amountXMin = minimumAmounts.amountX.toString();
    const amountYMin = minimumAmounts.amountY.toString();

    this._tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POSITION_MANAGER}::decrease_liquidity`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        this._tx.object(CONFIGS[this.network].poolRegistryObject),
        this._tx.object(position.id),
        this._tx.pure.u128(position.liquidity.toString()),
        this._tx.pure.u64(amountXMin),
        this._tx.pure.u64(amountYMin),
        this._tx.pure.u64(options.deadline),
        this._tx.object(CONFIGS[this.network].versionObject),
        this._tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    if (options.collectOptions) {
      return this.collect(position, options.collectOptions);
    }
  }

  public collect(
    position: ClmmPosition,
    options: CollectOptions
  ): TransactionResult | void {
    invariant(
      !options.recipient || isValidSuiAddress(options.recipient),
      'RECIPIENT'
    );
    const result = this._tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POSITION_MANAGER}::collect`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        this._tx.object(CONFIGS[this.network].poolRegistryObject),
        this._tx.object(position.id),
        this._tx.pure.u64(options.expectedCoinOwedX.quotient.toString()),
        this._tx.pure.u64(options.expectedCoinOwedY.quotient.toString()),
        this._tx.object(CONFIGS[this.network].versionObject),
        this._tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    if (options.recipient) {
      this._tx.transferObjects([result[0], result[1]], options.recipient);
    } else {
      return result;
    }
  }

  public collectPoolReward(
    position: ClmmPosition,
    options: CollectPoolRewardOptions
  ): TransactionResult | void {
    invariant(
      !options.recipient || isValidSuiAddress(options.recipient),
      'RECIPIENT'
    );

    const result = this._tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_POSITION_MANAGER}::collect_pool_reward`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
        options.expectedRewardOwed.coin.coinType,
      ],
      arguments: [
        this._tx.object(CONFIGS[this.network].poolRegistryObject),
        this._tx.object(position.id),
        this._tx.pure.u64(options.expectedRewardOwed.quotient.toString()),
        this._tx.object(CONFIGS[this.network].versionObject),
        this._tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    if (options.recipient) {
      this._tx.transferObjects([result[0]], options.recipient);
    } else {
      return result;
    }
  }

  public async getPosition(positionId: string): Promise<ClmmPosition> {
    const positionObject: any = await this._client.getObject({
      id: positionId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });
    invariant(
      positionObject.data &&
        positionObject.data.type === `${CONFIGS[this.network].positionType}`,
      'invalid position'
    );

    const rawData = positionObject.data.content?.['fields'] as PositionRawData;

    const poolInfo = await this.poolManager.getPoolDetail(rawData.pool_id);

    return new ClmmPosition({
      objectId: positionObject.data.objectId,
      owner: positionObject.data.owner?.['AddressOwner'],
      pool: poolInfo,
      tickLower: Number(
        BigInt.asIntN(32, BigInt(rawData.tick_lower_index.fields.bits))
      ),
      tickUpper: Number(
        BigInt.asIntN(32, BigInt(rawData.tick_upper_index.fields.bits))
      ),
      liquidity: rawData.liquidity,
      coinsOwedX: rawData.coins_owed_x,
      coinsOwedY: rawData.coins_owed_y,
      feeGrowthInsideXLast: rawData.fee_growth_inside_x_last,
      feeGrowthInsideYLast: rawData.fee_growth_inside_y_last,
      rewardInfos: poolInfo.poolRewards.map((_, idx) => ({
        coinsOwedReward:
          rawData.reward_infos[idx]?.fields.coins_owed_reward || '0',
        rewardGrowthInsideLast:
          rawData.reward_infos[idx]?.fields.reward_growth_inside_last || '0',
      })),
    });
  }

  public async getUserPositions(address: string): Promise<ClmmPosition[]> {
    const listPositionOnchain: any[] = await this.getFullyOwnedObjects(
      address,
      {
        showContent: true,
      },
      {
        StructType: CONFIGS[this.network].positionType,
      }
    );

    const poolIds = listPositionOnchain
      .map(
        (item) => (item.data?.content?.['fields'] as PositionRawData).pool_id
      )
      .filter((poolId) => !!poolId);

    const poolInfos = await this.poolManager.getPoolDetails(poolIds);

    //INIT POSITION
    return listPositionOnchain.map((item) => {
      invariant(item.data, 'invalid position');

      const rawData = item.data.content?.['fields'] as PositionRawData;
      const pool = poolInfos.find((poolInfo) => poolInfo.id == rawData.pool_id);
      invariant(pool, 'pool not found');

      return new ClmmPosition({
        objectId: item.data.objectId,
        owner: address,
        pool: pool,
        tickLower: Number(
          BigInt.asIntN(32, BigInt(rawData.tick_lower_index.fields.bits))
        ),
        tickUpper: Number(
          BigInt.asIntN(32, BigInt(rawData.tick_upper_index.fields.bits))
        ),
        liquidity: rawData.liquidity,
        coinsOwedX: rawData.coins_owed_x,
        coinsOwedY: rawData.coins_owed_y,
        feeGrowthInsideXLast: rawData.fee_growth_inside_x_last,
        feeGrowthInsideYLast: rawData.fee_growth_inside_y_last,
        rewardInfos: pool.poolRewards.map((_, idx) => ({
          coinsOwedReward:
            rawData.reward_infos[idx]?.fields.coins_owed_reward || '0',
          rewardGrowthInsideLast:
            rawData.reward_infos[idx]?.fields.reward_growth_inside_last || '0',
        })),
      });
    });
  }

  public async getPositionReward(
    positions: ClmmPosition[],
    maxQuery = 10
  ): Promise<ClmmPosition[]> {
    //GET POSITION REWARD
    let positionOnchainResult: any = [];
    const batches = chunk(positions, maxQuery);
    for (const positions of batches) {
      this.tx(new Transaction());
      for (const position of positions) {
        this.collect(position, {
          expectedCoinOwedX: CoinAmount.fromRawAmount(
            position.pool.coins[0],
            MaxUint64
          ),
          expectedCoinOwedY: CoinAmount.fromRawAmount(
            position.pool.coins[1],
            MaxUint64
          ),
        });
        position.pool.poolRewards?.map((it) => {
          this.collectPoolReward(position, {
            expectedRewardOwed: CoinAmount.fromRawAmount(it.coin, MaxUint64),
          });
        });
      }
      positionOnchainResult.push(
        await this._client.devInspectTransactionBlock({
          transactionBlock: this.getTx(),
          sender: positions[0].owner,
        })
      );
    }
    positionOnchainResult = positionOnchainResult
      .map((it: any) => it.events)
      .flat();
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      position.setFeeReward(
        positionOnchainResult
          .filter(
            (it: any) =>
              it.parsedJson.position_id == position.id &&
              it.type == CONFIGS[this.network].poolFeeCollectEventType
          )
          .map((it: any) => [
            CoinAmount.fromRawAmount(
              position.amountX.coin,
              it.parsedJson.amount_x
            ),
            CoinAmount.fromRawAmount(
              position.amountY.coin,
              it.parsedJson.amount_y
            ),
          ])
          .flat()
      );
      position.setIncentiveReward(
        positionOnchainResult
          .filter(
            (it: any) =>
              it.parsedJson.position_id == position.id &&
              it.type == CONFIGS[this.network].poolRewardCollectEventType
          )
          .map((it: any) =>
            CoinAmount.fromRawAmount(
              new Coin(it.parsedJson.reward_coin_type.name),
              it.parsedJson.amount
            )
          )
          .flat()
      );
    }

    return positions;
  }
}

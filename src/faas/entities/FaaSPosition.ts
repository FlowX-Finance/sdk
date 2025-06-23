import BN from 'bn.js';
import { FaaSPool } from './FaaSPool';
import {
  BigintIsh,
  Coin,
  CoinAmount,
  nowInMilliseconds,
  ObjectId,
  toSeconds,
  ZERO,
} from '../../core';
import { AmmPosition as LiquidityPosition } from '../../amm';
import { MAPPING_FLX_COIN_TYPE, REWARD_PRECISION } from '../constants';

interface PositionConstructorArgs {
  objectId: string;
  owner: string;
  pool: FaaSPool;
  liquidity: BigintIsh;
  tokenRewardDebt: BigintIsh;
  flxRewardDebt: BigintIsh;
}

export class FaaSPosition extends ObjectId {
  public readonly owner: string;
  public readonly pool: FaaSPool;
  public readonly liquidity: BigintIsh;
  public readonly tokenRewardDebt: BigintIsh;
  public readonly flxRewardDebt: BigintIsh;

  private _wrappedLiquidityPosition: LiquidityPosition;

  constructor({
    objectId,
    owner,
    pool,
    liquidity,
    tokenRewardDebt,
    flxRewardDebt,
  }: PositionConstructorArgs) {
    super(objectId);

    this.owner = owner;
    this.pool = pool;
    this.liquidity = liquidity;
    this.tokenRewardDebt = tokenRewardDebt;
    this.flxRewardDebt = flxRewardDebt;
    this._wrappedLiquidityPosition = new LiquidityPosition({
      owner,
      pool: pool.liquidityPool,
      liquidity,
    });
  }

  public get amountX(): CoinAmount<Coin> {
    return this._wrappedLiquidityPosition.amountX;
  }

  public get amountY(): CoinAmount<Coin> {
    return this._wrappedLiquidityPosition.amountY;
  }

  public get pendingRewards(): Readonly<{
    pendingToken: CoinAmount<Coin>;
    pendingFLX: CoinAmount<Coin>;
  }> {
    const totalLiquidityCoinStaked = this.pool.totalLiquidityCoinStaked;
    if (totalLiquidityCoinStaked.isZero()) {
      return {
        pendingToken: CoinAmount.fromRawAmount(
          new Coin(this.pool.tokenRewardType),
          ZERO
        ),
        pendingFLX: CoinAmount.fromRawAmount(
          new Coin(this.pool.flxTokenType),
          ZERO
        ),
      };
    }

    const multiplier = new BN(
      Math.max(
        toSeconds(
          Math.min(this.pool.closingTimestampMs, nowInMilliseconds()) -
            this.pool.lastRewardAtMs
        ),
        0
      )
    );

    const accTokenReward = new BN(this.pool.accTokenRewardPerSec).add(
      multiplier
        .mul(new BN(this.pool.tokenRewardPerSec.toString()))
        .mul(REWARD_PRECISION)
        .div(totalLiquidityCoinStaked)
    );
    const accFlxReward = new BN(this.pool.accFlxRewardPerSec).add(
      multiplier
        .mul(new BN(this.pool.flxRewardPerSec.toString()))
        .mul(REWARD_PRECISION)
        .div(totalLiquidityCoinStaked)
    );

    return {
      pendingToken: CoinAmount.fromRawAmount(
        new Coin(this.pool.tokenRewardType),
        accTokenReward
          .mul(new BN(this._wrappedLiquidityPosition.liquidity.toString()))
          .div(REWARD_PRECISION)
          .sub(new BN(this.tokenRewardDebt))
      ),
      pendingFLX: CoinAmount.fromRawAmount(
        new Coin(this.pool.flxTokenType),
        accFlxReward
          .mul(new BN(this._wrappedLiquidityPosition.liquidity.toString()))
          .div(REWARD_PRECISION)
          .sub(new BN(this.flxRewardDebt))
      ),
    };
  }
}

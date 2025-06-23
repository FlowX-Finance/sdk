import BN from 'bn.js';
import {
  ADDRESS_ZERO,
  BigintIsh,
  Coin,
  CoinAmount,
  now,
  ObjectId,
} from '../../core';
import {
  AmmPool as LiquidityPool,
  AmmPosition as LiquidityPosition,
} from '../../amm';

interface PoolConstructorArgs {
  objectId: string;
  poolIndex: number;
  tokenRewardType: string;
  flxTokenType: string;
  tokenRewardPerSec: BigintIsh;
  flxRewardPerSec: BigintIsh;
  accTokenRewardPerSec: BigintIsh;
  accFlxRewardPerSec: BigintIsh;
  lastRewardAtMs: number;
  startingTimestampMs: number;
  closingTimestampMs: number;
  creator: string;
  isEmergency: boolean;
  totalLiquidityCoinStaked: BigintIsh;
  liquidityPool: LiquidityPool;
}

export class FaaSPool extends ObjectId {
  public readonly poolIndex: number;
  public readonly tokenRewardType: string;
  public readonly flxTokenType: string;
  public readonly tokenRewardPerSec: BigintIsh;
  public readonly flxRewardPerSec: BigintIsh;
  public readonly accTokenRewardPerSec: BigintIsh;
  public readonly accFlxRewardPerSec: BigintIsh;
  public readonly lastRewardAtMs: number;
  public readonly startingTimestampMs: number;
  public readonly closingTimestampMs: number;
  public readonly creator: string;
  public readonly isEmergency: boolean;
  public readonly liquidityPool: LiquidityPool;

  private _wrappedLiquidityPosition: LiquidityPosition;

  constructor({
    objectId,
    poolIndex,
    tokenRewardType,
    flxTokenType,
    tokenRewardPerSec,
    flxRewardPerSec,
    accTokenRewardPerSec,
    accFlxRewardPerSec,
    lastRewardAtMs,
    startingTimestampMs,
    closingTimestampMs,
    creator,
    isEmergency,
    totalLiquidityCoinStaked,
    liquidityPool,
  }: PoolConstructorArgs) {
    super(objectId);
    this.poolIndex = poolIndex;
    this.tokenRewardType = tokenRewardType;
    this.flxTokenType = flxTokenType;
    this.tokenRewardPerSec = tokenRewardPerSec;
    this.flxRewardPerSec = flxRewardPerSec;
    this.accTokenRewardPerSec = accTokenRewardPerSec;
    this.accFlxRewardPerSec = accFlxRewardPerSec;
    this.lastRewardAtMs = lastRewardAtMs;
    this.startingTimestampMs = startingTimestampMs;
    this.closingTimestampMs = closingTimestampMs;
    this.creator = creator;
    this.isEmergency = isEmergency;
    this.liquidityPool = liquidityPool;

    this._wrappedLiquidityPosition = new LiquidityPosition({
      owner: ADDRESS_ZERO,
      pool: liquidityPool,
      liquidity: totalLiquidityCoinStaked,
    });
  }

  public get amountX(): CoinAmount<Coin> {
    return this._wrappedLiquidityPosition.amountX;
  }

  public get amountY(): CoinAmount<Coin> {
    return this._wrappedLiquidityPosition.amountY;
  }

  public get totalLiquidityCoinStaked(): BN {
    return new BN(this._wrappedLiquidityPosition.liquidity.toString());
  }

  public get isClosed(): boolean {
    return now() >= this.closingTimestampMs;
  }
}

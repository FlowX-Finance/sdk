import BN from 'bn.js';
import invariant from 'tiny-invariant';

import {
  ADDRESS_ZERO,
  BasePool,
  BigintIsh,
  Coin,
  CoinAmount,
  Fraction,
  ONE,
  Price,
  Q128,
} from '../../core';
import { NoTickDataProvider, TickDataProvider } from './TickDataProvider';
import { FeeAmount, TICK_SPACINGS } from '../constants';
import { ClmmPoolReward } from './ClmmPoolReward';
import { ClmmPosition } from './ClmmPosition';

const NO_TICK_DATA_PROVIDER_DEFAULT = new NoTickDataProvider();

export class ClmmPool extends BasePool {
  public readonly fee!: FeeAmount;
  public readonly sqrtPriceX64!: BigintIsh;
  public readonly tickCurrent!: number;
  public readonly liquidity!: BigintIsh;
  public readonly feeGrowthGlobalX!: BigintIsh;
  public readonly feeGrowthGlobalY!: BigintIsh;
  public readonly poolRewards!: ClmmPoolReward[];
  public readonly tickDataProvider!: TickDataProvider;

  private _coinXPrice: Price<Coin, Coin>;
  private _coinYPrice: Price<Coin, Coin>;

  constructor(
    objectId: string,
    coins: Coin[],
    poolRewards: ClmmPoolReward[],
    reserves: BigintIsh[],
    fee: FeeAmount,
    sqrtPriceX64: BigintIsh,
    tickCurrent: number,
    liquidity: BigintIsh,
    feeGrowthGlobalX: BigintIsh,
    feeGrowthGlobalY: BigintIsh,
    tickDataProvider: TickDataProvider = NO_TICK_DATA_PROVIDER_DEFAULT
  ) {
    invariant(coins.length === 2, 'COINS_LENGTH');

    coins = coins[0].sortsBefore(coins[1])
      ? [coins[0], coins[1]]
      : [coins[1], coins[0]];
    super(objectId, coins, reserves);

    this.fee = fee;
    this.sqrtPriceX64 = sqrtPriceX64;
    this.tickCurrent = tickCurrent;
    this.liquidity = liquidity;
    this.feeGrowthGlobalX = feeGrowthGlobalX;
    this.feeGrowthGlobalY = feeGrowthGlobalY;
    this.poolRewards = poolRewards;
    this.tickDataProvider = tickDataProvider;
  }

  public get coinXPrice(): Price<Coin, Coin> {
    return (
      this._coinXPrice ??
      (this._coinXPrice = new Price(
        this.coins[0],
        this.coins[1],
        Q128,
        new BN(this.sqrtPriceX64).mul(new BN(this.sqrtPriceX64))
      ))
    );
  }

  public get coinYPrice(): Price<Coin, Coin> {
    return (
      this._coinYPrice ??
      (this._coinYPrice = new Price(
        this.coins[1],
        this.coins[0],
        new BN(this.sqrtPriceX64).mul(new BN(this.sqrtPriceX64)),
        Q128
      ))
    );
  }

  public get coinX(): Coin {
    return this.coins[0];
  }

  public get coinY(): Coin {
    return this.coins[1];
  }

  public priceOf(coin: Coin): Price<Coin, Coin> {
    invariant(this.involvesCoin(coin), 'COIN');
    return coin.equals(this.coins[0]) ? this.coinXPrice : this.coinYPrice;
  }

  public get tickSpacing(): number {
    return TICK_SPACINGS[this.fee];
  }

  public getRatio(tickLower: number, tickUpper: number): Fraction {
    const mintAmounts = ClmmPosition.fromAmounts({
      owner: ADDRESS_ZERO,
      pool: this,
      amountX: CoinAmount.ONE(this.coinX).quotient, // one decimal amount
      amountY: CoinAmount.ONE(this.coinY).quotient, // one decimal amount
      tickLower,
      tickUpper,
      useFullPrecision: true,
    }).mintAmounts;

    return new Fraction(mintAmounts.amountY, mintAmounts.amountX);
  }
}

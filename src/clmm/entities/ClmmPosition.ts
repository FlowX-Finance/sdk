import BN from 'bn.js';
import invariant from 'tiny-invariant';

import {
  ADDRESS_ZERO,
  BigintIsh,
  Coin,
  ONE,
  ObjectId,
  Percent,
  Price,
  Q64,
  ZERO,
  nowInMilliseconds,
  toSeconds,
} from '../../core';
import { CoinAmount } from '../../core/entities/CoinAmount';
import { ClmmPool } from './ClmmPool';
import {
  ClmmLiquidityMath,
  ClmmSqrtPriceMath,
  ClmmTickMath,
  TickLibrary,
  tickToPrice,
} from '../utils';
import { encodeSqrtRatioX64 } from '../utils/encodeSqrtRatioX64';
import { ClmmFullMath } from '../utils/ClmmFullMath';
import { ClmmPositionReward } from './ClmmPositionReward';

interface PositionRewardInfoArgs {
  coinsOwedReward: BigintIsh;
  rewardGrowthInsideLast: BigintIsh;
}

interface PositionConstructorArgs {
  objectId?: string;
  owner: string;
  pool: ClmmPool;
  tickLower: number;
  tickUpper: number;
  liquidity: BigintIsh;
  coinsOwedX: BigintIsh;
  coinsOwedY: BigintIsh;
  feeGrowthInsideXLast: BigintIsh;
  feeGrowthInsideYLast: BigintIsh;
  rewardInfos: PositionRewardInfoArgs[];
}

export class ClmmPosition extends ObjectId {
  public readonly owner: string;
  public readonly pool: ClmmPool;
  public readonly tickLower: number;
  public readonly tickUpper: number;
  public readonly liquidity: BN;
  public readonly coinsOwedX: BN;
  public readonly coinsOwedY: BN;
  public readonly feeGrowthInsideXLast: BN;
  public readonly feeGrowthInsideYLast: BN;
  public readonly rewardInfos: ClmmPositionReward[];

  public feeReward: CoinAmount<Coin>[] | null = null;
  public incentiveReward: CoinAmount<Coin>[] | null = null;

  private _coinXAmount: CoinAmount<Coin> | null = null;
  private _coinYAmount: CoinAmount<Coin> | null = null;
  private _mintAmounts: Readonly<{ amountX: BN; amountY: BN }> | null = null;

  public constructor({
    objectId,
    owner,
    pool,
    tickLower,
    tickUpper,
    liquidity,
    coinsOwedX,
    coinsOwedY,
    feeGrowthInsideXLast,
    feeGrowthInsideYLast,
    rewardInfos,
  }: PositionConstructorArgs) {
    invariant(tickLower < tickUpper, 'TICK_ORDER');
    invariant(
      tickLower >= ClmmTickMath.MIN_TICK && tickLower % pool.tickSpacing === 0,
      'TICK_LOWER'
    );
    invariant(
      tickUpper <= ClmmTickMath.MAX_TICK && tickUpper % pool.tickSpacing === 0,
      'TICK_UPPER'
    );

    super(objectId || ADDRESS_ZERO);
    this.owner = owner;
    this.pool = pool;
    this.tickLower = tickLower;
    this.tickUpper = tickUpper;
    this.liquidity = new BN(liquidity);
    this.coinsOwedX = new BN(coinsOwedX);
    this.coinsOwedY = new BN(coinsOwedY);
    this.rewardInfos = rewardInfos.map(
      (rewardInfo) =>
        new ClmmPositionReward({
          coinsOwedReward: rewardInfo.coinsOwedReward,
          rewardGrowthInsideLast: rewardInfo.rewardGrowthInsideLast,
        })
    );
    this.feeGrowthInsideXLast = new BN(feeGrowthInsideXLast);
    this.feeGrowthInsideYLast = new BN(feeGrowthInsideYLast);
  }

  public get priceLower(): Price<Coin, Coin> {
    return tickToPrice(this.pool.coins[0], this.pool.coins[1], this.tickLower);
  }

  public get priceUpper(): Price<Coin, Coin> {
    return tickToPrice(this.pool.coins[0], this.pool.coins[1], this.tickUpper);
  }

  public get amountX(): CoinAmount<Coin> {
    if (this._coinXAmount === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        this._coinXAmount = CoinAmount.fromRawAmount(
          this.pool.coins[0],
          ClmmSqrtPriceMath.getAmountXDelta(
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickLower),
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            false
          )
        );
      } else if (this.pool.tickCurrent < this.tickUpper) {
        this._coinXAmount = CoinAmount.fromRawAmount(
          this.pool.coins[0],
          ClmmSqrtPriceMath.getAmountXDelta(
            new BN(this.pool.sqrtPriceX64),
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            false
          )
        );
      } else {
        this._coinXAmount = CoinAmount.fromRawAmount(this.pool.coins[0], ZERO);
      }
    }
    return this._coinXAmount;
  }

  /**
   * Returns the amount of token1 that this position's liquidity could be burned for at the current pool price
   */
  public get amountY(): CoinAmount<Coin> {
    if (this._coinYAmount === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        this._coinYAmount = CoinAmount.fromRawAmount(this.pool.coins[1], ZERO);
      } else if (this.pool.tickCurrent < this.tickUpper) {
        this._coinYAmount = CoinAmount.fromRawAmount(
          this.pool.coins[1],
          ClmmSqrtPriceMath.getAmountYDelta(
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickLower),
            new BN(this.pool.sqrtPriceX64),
            this.liquidity,
            false
          )
        );
      } else {
        this._coinYAmount = CoinAmount.fromRawAmount(
          this.pool.coins[1],
          ClmmSqrtPriceMath.getAmountYDelta(
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickLower),
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            false
          )
        );
      }
    }
    return this._coinYAmount;
  }

  public get mintAmounts(): Readonly<{ amountX: BN; amountY: BN }> {
    if (this._mintAmounts === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        return {
          amountX: ClmmSqrtPriceMath.getAmountXDelta(
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickLower),
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            true
          ),
          amountY: ZERO,
        };
      } else if (this.pool.tickCurrent < this.tickUpper) {
        return {
          amountX: ClmmSqrtPriceMath.getAmountXDelta(
            new BN(this.pool.sqrtPriceX64),
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            true
          ),
          amountY: ClmmSqrtPriceMath.getAmountYDelta(
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickLower),
            new BN(this.pool.sqrtPriceX64),
            this.liquidity,
            true
          ),
        };
      } else {
        return {
          amountX: ZERO,
          amountY: ClmmSqrtPriceMath.getAmountYDelta(
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickLower),
            ClmmTickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            true
          ),
        };
      }
    }
    return this._mintAmounts;
  }

  public static fromAmounts({
    objectId,
    owner,
    pool,
    tickLower,
    tickUpper,
    amountX,
    amountY,
    useFullPrecision,
  }: {
    objectId?: string;
    owner: string;
    pool: ClmmPool;
    tickLower: number;
    tickUpper: number;
    amountX: BigintIsh;
    amountY: BigintIsh;
    useFullPrecision: boolean;
  }) {
    const sqrtRatioAX64 = ClmmTickMath.tickIndexToSqrtPriceX64(tickLower);
    const sqrtRatioBX64 = ClmmTickMath.tickIndexToSqrtPriceX64(tickUpper);
    return new ClmmPosition({
      objectId,
      owner,
      pool,
      tickLower,
      tickUpper,
      liquidity: ClmmLiquidityMath.maxLiquidityForAmounts(
        new BN(pool.sqrtPriceX64),
        sqrtRatioAX64,
        sqrtRatioBX64,
        amountX,
        amountY,
        useFullPrecision
      ),
      coinsOwedX: ZERO,
      coinsOwedY: ZERO,
      feeGrowthInsideXLast: ZERO,
      feeGrowthInsideYLast: ZERO,
      rewardInfos: [],
    });
  }

  /**
   * Returns the lower and upper sqrt ratios if the price 'slips' up to slippage tolerance percentage
   * @param slippageTolerance The amount by which the price can 'slip' before the transaction will revert
   * @returns The sqrt ratios after slippage
   */
  private ratiosAfterSlippage(slippageTolerance: Percent): {
    sqrtRatioX64Lower: BN;
    sqrtRatioX64Upper: BN;
  } {
    const priceLower = this.pool.coinXPrice.asFraction.multiply(
      new Percent(1).subtract(slippageTolerance)
    );
    const priceUpper = this.pool.coinXPrice.asFraction.multiply(
      slippageTolerance.add(1)
    );
    let sqrtRatioX64Lower = encodeSqrtRatioX64(
      priceLower.numerator,
      priceLower.denominator
    );
    if (sqrtRatioX64Lower.lte(ClmmTickMath.MIN_SQRT_RATIO)) {
      sqrtRatioX64Lower = ClmmTickMath.MIN_SQRT_RATIO.add(ONE);
    }
    let sqrtRatioX64Upper = encodeSqrtRatioX64(
      priceUpper.numerator,
      priceUpper.denominator
    );
    if (sqrtRatioX64Upper.gte(ClmmTickMath.MAX_SQRT_RATIO)) {
      sqrtRatioX64Upper = ClmmTickMath.MAX_SQRT_RATIO.sub(ONE);
    }
    return {
      sqrtRatioX64Lower,
      sqrtRatioX64Upper,
    };
  }

  /**
   * Returns the minimum amounts that must be sent in order to safely mint the amount of liquidity held by the position
   * with the given slippage tolerance
   * @param slippageTolerance Tolerance of unfavorable slippage from the current price
   * @returns The amounts, with slippage
   */
  public mintAmountsWithSlippage(
    slippageTolerance: Percent
  ): Readonly<{ amountX: BN; amountY: BN }> {
    // get lower/upper prices
    const { sqrtRatioX64Upper, sqrtRatioX64Lower } =
      this.ratiosAfterSlippage(slippageTolerance);

    // construct counterfactual pools
    const poolLower = new ClmmPool(
      this.pool.id,
      this.pool.coins,
      [] /* reward infos don't matter */,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Lower,
      ClmmTickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Lower),
      0 /* liquidity doesn't matter */,
      0 /* fee growth global doesn't matter */,
      0 /* fee growth global doesn't matter */
    );
    const poolUpper = new ClmmPool(
      this.pool.id,
      this.pool.coins,
      [] /* reward infos don't matter */,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Upper,
      ClmmTickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Upper),
      0 /* liquidity doesn't matter */,
      0 /* fee growth global doesn't matter */,
      0 /* fee growth global doesn't matter */
    );

    // because the router is imprecise, we need to calculate the position that will be created (assuming no slippage)
    const positionThatWillBeCreated = ClmmPosition.fromAmounts({
      owner: this.owner,
      pool: this.pool,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      ...this.mintAmounts, // the mint amounts are what will be passed as calldata
      useFullPrecision: false,
    });

    // we want the smaller amounts...
    // ...which occurs at the upper price for amount0...
    const { amountX } = new ClmmPosition({
      owner: this.owner,
      pool: poolUpper,
      liquidity: positionThatWillBeCreated.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      coinsOwedX: ZERO,
      coinsOwedY: ZERO,
      feeGrowthInsideXLast: ZERO,
      feeGrowthInsideYLast: ZERO,
      rewardInfos: [],
    }).mintAmounts;
    // ...and the lower for amount1
    const { amountY } = new ClmmPosition({
      owner: this.owner,
      pool: poolLower,
      liquidity: positionThatWillBeCreated.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      coinsOwedX: ZERO,
      coinsOwedY: ZERO,
      feeGrowthInsideXLast: ZERO,
      feeGrowthInsideYLast: ZERO,
      rewardInfos: [],
    }).mintAmounts;

    return { amountX, amountY };
  }

  public burnAmountsWithSlippage(
    slippageTolerance: Percent
  ): Readonly<{ amountX: BN; amountY: BN }> {
    // get lower/upper prices
    const { sqrtRatioX64Upper, sqrtRatioX64Lower } =
      this.ratiosAfterSlippage(slippageTolerance);

    // construct counterfactual pools
    const poolLower = new ClmmPool(
      this.pool.id,
      this.pool.coins,
      [] /* reward infos don't matter */,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Lower,
      ClmmTickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Lower),
      0 /* liquidity doesn't matter */,
      0 /* fee growth global doesn't matter */,
      0 /* fee growth global doesn't matter */
    );
    const poolUpper = new ClmmPool(
      this.pool.id,
      this.pool.coins,
      [] /* reward infos don't matter */,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Upper,
      ClmmTickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Upper),
      0 /* liquidity doesn't matter */,
      0 /* fee growth global doesn't matter */,
      0 /* fee growth global doesn't matter */
    );

    // we want the smaller amounts...
    // ...which occurs at the upper price for amount0...
    const amountX = new ClmmPosition({
      owner: this.owner,
      pool: poolUpper,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      coinsOwedX: ZERO,
      coinsOwedY: ZERO,
      feeGrowthInsideXLast: this.feeGrowthInsideXLast,
      feeGrowthInsideYLast: this.feeGrowthInsideYLast,
      rewardInfos: [],
    }).amountX;
    // ...and the lower for amount1
    const amountY = new ClmmPosition({
      owner: this.owner,
      pool: poolLower,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      coinsOwedX: ZERO,
      coinsOwedY: ZERO,
      feeGrowthInsideXLast: this.feeGrowthInsideXLast,
      feeGrowthInsideYLast: this.feeGrowthInsideYLast,
      rewardInfos: [],
    }).amountY;

    return { amountX: amountX.quotient, amountY: amountY.quotient };
  }

  async getFees(): Promise<
    Readonly<{
      amountX: BN;
      amountY: BN;
    }>
  > {
    const [tickInfoLower, tickInfoUpper] = await Promise.all([
      this.pool.tickDataProvider.getTick(this.tickLower),
      this.pool.tickDataProvider.getTick(this.tickUpper),
    ]);

    const [feeGrowthInsideX, feeGrowthInsideY] = TickLibrary.getFeeGrowthInside(
      {
        feeGrowthOutsideX: tickInfoLower.feeGrowthOutsideX,
        feeGrowthOutsideY: tickInfoLower.feeGrowthOutsideY,
      },
      {
        feeGrowthOutsideX: tickInfoUpper.feeGrowthOutsideX,
        feeGrowthOutsideY: tickInfoUpper.feeGrowthOutsideY,
      },
      this.tickLower,
      this.tickUpper,
      this.pool.tickCurrent,
      new BN(this.pool.feeGrowthGlobalX),
      new BN(this.pool.feeGrowthGlobalY)
    );

    return {
      amountX: this.coinsOwedX.add(
        ClmmFullMath.mulDivRoundingDown(
          ClmmFullMath.wrappingSubIn128(
            feeGrowthInsideX,
            this.feeGrowthInsideXLast
          ),
          this.liquidity,
          Q64
        )
      ),
      amountY: this.coinsOwedY.add(
        ClmmFullMath.mulDivRoundingDown(
          ClmmFullMath.wrappingSubIn128(
            feeGrowthInsideY,
            this.feeGrowthInsideYLast
          ),
          this.liquidity,
          Q64
        )
      ),
    };
  }

  async getRewards(): Promise<Readonly<BN[]>> {
    const [tickInfoLower, tickInfoUpper] = await Promise.all([
      this.pool.tickDataProvider.getTick(this.tickLower),
      this.pool.tickDataProvider.getTick(this.tickUpper),
    ]);

    const rewardsGrowthInside = TickLibrary.getRewardsGrowthInside(
      tickInfoLower.rewardGrowthsOutside,
      tickInfoUpper.rewardGrowthsOutside,
      this.tickLower,
      this.tickUpper,
      this.pool.tickCurrent,
      this.pool.poolRewards.map((rewardInfo) => {
        const elapsedSecs = Math.max(
          Math.min(toSeconds(nowInMilliseconds()), rewardInfo.endedAtSeconds) -
            rewardInfo.lastUpdateTime,
          0
        );
        const pendingRewardGrowth = new BN(rewardInfo.rewardPerSeconds)
          .mul(new BN(elapsedSecs))
          .div(new BN(this.pool.liquidity));

        return new BN(rewardInfo.rewardGrowthGlobal).add(pendingRewardGrowth);
      })
    );

    return rewardsGrowthInside.map((rewardGrowthInside, idx) =>
      (this.rewardInfos[idx]?.coinsOwedReward ?? ZERO).add(
        ClmmFullMath.mulDivRoundingDown(
          ClmmFullMath.wrappingSubIn128(
            rewardGrowthInside,
            this.rewardInfos[idx]?.rewardGrowthInsideLast ?? ZERO
          ),
          this.liquidity,
          Q64
        )
      )
    );
  }

  public setFeeReward(rewards: CoinAmount<Coin>[]) {
    this.feeReward = rewards;
  }

  public setIncentiveReward(rewards: CoinAmount<Coin>[]) {
    this.incentiveReward = rewards;
  }
}

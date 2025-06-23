import BN from 'bn.js';
import { BigintIsh, Q64 } from '../../core';

export class ClmmLiquidityMath {
  public static maxLiquidityForAmountXImprecise(
    sqrtRatioAX64: BN,
    sqrtRatioBX64: BN,
    amountX: BigintIsh
  ): BN {
    if (sqrtRatioAX64.gt(sqrtRatioBX64)) {
      [sqrtRatioAX64, sqrtRatioBX64] = [sqrtRatioBX64, sqrtRatioAX64];
    }

    const intermediate = sqrtRatioAX64.mul(sqrtRatioBX64).div(Q64);
    return new BN(amountX)
      .mul(intermediate)
      .div(sqrtRatioBX64.sub(sqrtRatioAX64));
  }

  public static maxLiquidityForAmountXPrecise(
    sqrtRatioAX64: BN,
    sqrtRatioBX64: BN,
    amountX: BigintIsh
  ): BN {
    if (sqrtRatioAX64.gt(sqrtRatioBX64)) {
      [sqrtRatioAX64, sqrtRatioBX64] = [sqrtRatioBX64, sqrtRatioAX64];
    }

    const numerator = new BN(amountX).mul(sqrtRatioAX64).mul(sqrtRatioBX64);
    const denominator = Q64.mul(sqrtRatioBX64.sub(sqrtRatioAX64));

    return numerator.div(denominator);
  }

  public static maxLiquidityForAmountY(
    sqrtRatioAX64: BN,
    sqrtRatioBX64: BN,
    amountY: BigintIsh
  ): BN {
    if (sqrtRatioAX64.gt(sqrtRatioBX64)) {
      [sqrtRatioAX64, sqrtRatioBX64] = [sqrtRatioBX64, sqrtRatioAX64];
    }

    return new BN(amountY).mul(Q64).div(sqrtRatioBX64.sub(sqrtRatioAX64));
  }

  public static maxLiquidityForAmounts(
    sqrtRatioCurrentX64: BN,
    sqrtRatioAX64: BN,
    sqrtRatioBX64: BN,
    amountX: BigintIsh,
    amountY: BigintIsh,
    useFullPrecision: boolean
  ): BN {
    if (sqrtRatioAX64.gt(sqrtRatioBX64)) {
      [sqrtRatioAX64, sqrtRatioBX64] = [sqrtRatioBX64, sqrtRatioAX64];
    }

    const maxLiquidityForAmountX = useFullPrecision
      ? ClmmLiquidityMath.maxLiquidityForAmountXPrecise
      : ClmmLiquidityMath.maxLiquidityForAmountXImprecise;

    if (sqrtRatioCurrentX64.lte(sqrtRatioAX64)) {
      return maxLiquidityForAmountX(sqrtRatioAX64, sqrtRatioBX64, amountX);
    } else if (sqrtRatioCurrentX64.lt(sqrtRatioBX64)) {
      const liquidity0 = maxLiquidityForAmountX(
        sqrtRatioCurrentX64,
        sqrtRatioBX64,
        amountX
      );
      const liquidity1 = ClmmLiquidityMath.maxLiquidityForAmountY(
        sqrtRatioAX64,
        sqrtRatioCurrentX64,
        amountY
      );
      return liquidity0.lt(liquidity1) ? liquidity0 : liquidity1;
    } else {
      return ClmmLiquidityMath.maxLiquidityForAmountY(
        sqrtRatioAX64,
        sqrtRatioBX64,
        amountY
      );
    }
  }
}

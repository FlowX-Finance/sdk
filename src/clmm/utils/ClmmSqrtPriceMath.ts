import BN from 'bn.js';
import invariant from 'tiny-invariant';
import { ClmmFullMath } from './ClmmFullMath';
import { MaxUint256, ONE, Q64, ZERO } from '../../core';

// const MaxUint160 = BN.subtract(
//   BN.exponentiate(BN.BigInt(2), BN.BigInt(160)),
//   ONE
// );

function multiplyIn256(x: BN, y: BN): BN {
  const product = x.mul(y);
  return product.and(MaxUint256);
}

function addIn256(x: BN, y: BN): BN {
  const sum = x.add(y);
  return sum.and(MaxUint256);
}

export class ClmmSqrtPriceMath {
  public static getAmountXDelta(
    sqrtRatioAX64: BN,
    sqrtRatioBX64: BN,
    liquidity: BN,
    roundUp: boolean
  ): BN {
    if (sqrtRatioAX64.gt(sqrtRatioBX64)) {
      [sqrtRatioAX64, sqrtRatioBX64] = [sqrtRatioBX64, sqrtRatioAX64];
    }

    const numerator1 = liquidity.shln(64);
    const numerator2 = sqrtRatioBX64.sub(sqrtRatioAX64);

    return roundUp
      ? ClmmFullMath.mulDivRoundingUp(
          ClmmFullMath.mulDivRoundingUp(numerator1, numerator2, sqrtRatioBX64),
          ONE,
          sqrtRatioAX64
        )
      : numerator1.mul(numerator2).div(sqrtRatioBX64).div(sqrtRatioAX64);
  }

  public static getAmountYDelta(
    sqrtRatioAX64: BN,
    sqrtRatioBX64: BN,
    liquidity: BN,
    roundUp: boolean
  ): BN {
    if (sqrtRatioAX64.gt(sqrtRatioBX64)) {
      [sqrtRatioAX64, sqrtRatioBX64] = [sqrtRatioBX64, sqrtRatioAX64];
    }

    return roundUp
      ? ClmmFullMath.mulDivRoundingUp(
          liquidity,
          sqrtRatioBX64.sub(sqrtRatioAX64),
          Q64
        )
      : liquidity.mul(sqrtRatioBX64.sub(sqrtRatioAX64)).div(Q64);
  }
}

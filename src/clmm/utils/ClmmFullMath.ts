import BN from 'bn.js';
import { ONE, Q128, ZERO } from '../../core';

export abstract class ClmmFullMath {
  public static mulDivRoundingUp(a: BN, b: BN, denominator: BN): BN {
    const product = a.mul(b);
    let result = product.div(denominator);
    if (product.mod(denominator).eq(ZERO)) result = result.add(ONE);
    return result;
  }

  public static mulDivRoundingDown(a: BN, b: BN, denominator: BN): BN {
    const product = a.mul(b);
    const result = product.div(denominator);
    return result;
  }

  public static wrappingSubIn128(x: BN, y: BN): BN {
    const difference = x.sub(y);

    if (difference.lt(ZERO)) {
      return Q128.add(difference);
    } else {
      return difference;
    }
  }
}

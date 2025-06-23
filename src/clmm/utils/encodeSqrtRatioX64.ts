/**
 * Returns the sqrt ratio as a Q64.96 corresponding to a given ratio of amount1 and amount0
 * @param amount1 The numerator amount i.e., the amount of token1
 * @param amount0 The denominator amount i.e., the amount of token0
 * @returns The sqrt ratio
 */

import BN from 'bn.js';
import { BigintIsh, sqrtBn } from '../../core';

export function encodeSqrtRatioX64(amount1: BigintIsh, amount0: BigintIsh): BN {
  const numerator = new BN(amount1).shln(128);
  const denominator = new BN(amount0);
  const ratioX128 = numerator.div(denominator);
  return sqrtBn(ratioX128);
}

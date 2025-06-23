import BN from 'bn.js';
import { ClmmPool } from '../entities';
import { ClmmTickMath } from './ClmmTickMath';

export const closestActiveRange = (pool: ClmmPool, multiplier = 1) => {
  const halfRange = (multiplier * pool.tickSpacing) / 2;
  const candidateTickLower =
    Math.round((pool.tickCurrent - halfRange) / pool.tickSpacing) *
    pool.tickSpacing;

  let lowerTick = candidateTickLower;
  const currentSqrtPriceX64 = new BN(pool.sqrtPriceX64);
  if (
    currentSqrtPriceX64.lt(
      ClmmTickMath.tickIndexToSqrtPriceX64(pool.tickCurrent)
    )
  ) {
    if (lowerTick === pool.tickCurrent) {
      lowerTick -= pool.tickSpacing;
    }
  }

  return [lowerTick, lowerTick + multiplier * pool.tickSpacing];
};

import { BN } from 'bn.js';
import { BigintIsh, Coin, Price, Q128 } from '../../core';
import { ClmmTickMath } from './ClmmTickMath';
import { encodeSqrtRatioX64 } from './encodeSqrtRatioX64';
/**
 * Returns a price object corresponding to the input tick and the base/quote token
 * Inputs must be tokens because the address order is used to interpret the price represented by the tick
 * @param baseCoin the base token of the price
 * @param quoteCoin the quote token of the price
 * @param tick the tick for which to return the price
 */
export function tickToPrice(
  baseCoin: Coin,
  quoteCoin: Coin,
  tick: number
): Price<Coin, Coin> {
  const sqrtRatioX64 = ClmmTickMath.tickIndexToSqrtPriceX64(tick);

  return sqrtPriceX64ToPrice(baseCoin, quoteCoin, sqrtRatioX64);
}

/**
 * 
 * 
 * @param baseCoin 
 * @param quoteCoin 
 * @param sqrtPriceX64 
 * @returns 
 */
export function sqrtPriceX64ToPrice(
  baseCoin: Coin,
  quoteCoin: Coin,
  sqrtPriceX64: BigintIsh
): Price<Coin, Coin> {
  const ratioX128 = new BN(sqrtPriceX64).mul(new BN(sqrtPriceX64));

  return baseCoin.sortsBefore(quoteCoin)
    ? new Price(baseCoin, quoteCoin, Q128, ratioX128)
    : new Price(baseCoin, quoteCoin, ratioX128, Q128);
}

/**
 * Returns the first tick for which the given price is greater than or equal to the tick price
 * @param price for which to return the closest tick that represents a price less than or equal to the input price,
 * i.e. the price of the returned tick is less than or equal to the input price
 */
export function priceToClosestTick(price: Price<Coin, Coin>): number {
  const sorted = price.baseCoin.sortsBefore(price.quoteCoin);

  const sqrtRatioX96 = sorted
    ? encodeSqrtRatioX64(price.numerator, price.denominator)
    : encodeSqrtRatioX64(price.denominator, price.numerator);

  let tick = ClmmTickMath.sqrtPriceX64ToTickIndex(sqrtRatioX96);
  const nextTickPrice = tickToPrice(price.baseCoin, price.quoteCoin, tick + 1);
  if (sorted) {
    if (!price.lt(nextTickPrice)) {
      tick++;
    }
  } else {
    if (!price.gt(nextTickPrice)) {
      tick++;
    }
  }
  return tick;
}

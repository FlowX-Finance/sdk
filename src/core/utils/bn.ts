import BN from 'bn.js';
import { ZERO } from '../constants';
import invariant from 'tiny-invariant';

export function sumBn(bigNumbers: BN[]): BN {
  return bigNumbers.reduce((memo, bn) => memo.add(bn), ZERO);
}

export function minBn(...bigNumbers: BN[]): BN {
  invariant(bigNumbers.length > 0, 'EMPTY');
  let min = bigNumbers[0];
  for (let i = 1; i < bigNumbers.length; i++) {
    if (bigNumbers[i].lt(min)) min = bigNumbers[i];
  }

  return min;
}

export function maxBn(...bigNumbers: BN[]): BN {
  invariant(bigNumbers.length > 0, 'EMPTY');
  let max = bigNumbers[0];
  for (let i = 1; i < bigNumbers.length; i++) {
    if (bigNumbers[i].gt(max)) max = bigNumbers[i];
  }

  return max;
}

export const sqrtBn = (x: BN): BN => {
  let bit = new BN('1').shln(256);

  let res = new BN(0); // Result starts at 0

  // Perform bitwise algorithm to calculate the integer square root
  while (!bit.isZero()) {
    if (x.gte(res.add(bit))) {
      x = x.sub(res.add(bit));
      res = res.shrn(1).add(bit);
    } else {
      res = res.shrn(1);
    }
    bit = bit.shrn(2);
  }

  return res;
};

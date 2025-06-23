import invariant from 'tiny-invariant';
import { isSorted } from './isSorted';
import { ZERO } from '../../core';
import { BN } from 'bn.js';
import { Tick } from '../entities';

function tickComparator(a: Tick, b: Tick) {
  return a.index - b.index;
}

/**
 * Utility methods for interacting with sorted lists of ticks
 */
export class TickList {
  #contents: { [tickIndex: number]: Tick } = {};

  constructor(ticks: Tick[]) {
    ticks.forEach((tick) => {
      invariant(!this.#contents[tick.index], 'DUPLICATE_TICK');
      this.#contents[tick.index] = tick;
    });
  }

  public static validateList(ticks: Tick[], tickSpacing: number) {
    invariant(tickSpacing > 0, 'TICK_SPACING_NONZERO');
    // ensure ticks are spaced appropriately
    invariant(
      ticks.every(({ index }) => index % tickSpacing === 0),
      'TICK_SPACING'
    );

    // ensure tick liquidity deltas sum to 0
    invariant(
      ticks.reduce(
        (accumulator, { liquidityNet }) =>
          accumulator.add(new BN(liquidityNet)),
        ZERO
      ),
      'ZERO_NET'
    );

    invariant(isSorted(ticks, tickComparator), 'SORTED');
  }

  public getTick(index: number): Tick {
    const tick = this.#contents[index];
    invariant(tick?.index === index, 'NOT_CONTAINED');
    return tick;
  }
}

import { TickList } from '../utils/TickList';
import { Tick, TickConstructorArgs } from './Tick';
import { TickDataProvider } from './TickDataProvider';

/**
 * A data provider for ticks that is backed by an in-memory array of ticks.
 */
export class TickListDataProvider implements TickDataProvider {
  private tickList: TickList;

  constructor(ticks: (Tick | TickConstructorArgs)[], tickSpacing: number) {
    const ticksMapped: Tick[] = ticks.map((t) =>
      t instanceof Tick ? t : new Tick(t)
    );
    TickList.validateList(ticksMapped, tickSpacing);
    this.tickList = new TickList(ticksMapped);
  }

  async getTick(tick: number): Promise<Tick> {
    return this.tickList.getTick(tick);
  }
}

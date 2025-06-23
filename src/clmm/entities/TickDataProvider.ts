import { Tick } from './Tick';

export interface TickDataProvider {
  getTick(index: number): Promise<Tick>;
}

export class NoTickDataProvider implements TickDataProvider {
  private static ERROR_MESSAGE = 'No tick data provider was given';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTick(index: number): Promise<Tick> {
    throw new Error(NoTickDataProvider.ERROR_MESSAGE);
  }
}

import { ClmmPoolManager } from './ClmmPoolManager';

describe('Pool Manager CLMM Test', () => {
  it(`get all pool`, async () => {
    const poolManager = new ClmmPoolManager('mainnet');
    const pools = await poolManager.getPools();

    expect(pools.length >= 400).toBeTruthy();
  }, 999999999);
});

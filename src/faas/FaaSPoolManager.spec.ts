import { FaaSPoolManager as PoolManager } from './FaaSPoolManager';

describe('PoolManager tests', () => {
  it(`should get pools correctly`, async () => {
    const poolManager = new PoolManager('mainnet');

    const poolIndex = 108;
    const pool = await poolManager.getPool(poolIndex);

    expect(pool.id).toEqual(
      '0x93b0d6e01818e2b696cdf2521fef6561dfc90d35a2ee053731bd5369720c61ca'
    );
    expect(pool.liquidityPool.id).toEqual(
      '0x5986dd957451bd806461ec4f1afeaccbb2f68f38f7a543c868ec2d4e63d9d176'
    );
  });

  it(`should multi get pools correctly`, async () => {
    const poolManager = new PoolManager('mainnet');

    const poolIndexes = [108, 89, 109];
    const pools = await poolManager.multiGetPools(poolIndexes);
    expect(pools.length).toEqual(3);
    expect(pools[0].id).toEqual(
      '0x93b0d6e01818e2b696cdf2521fef6561dfc90d35a2ee053731bd5369720c61ca'
    );
    expect(pools[0].liquidityPool.id).toEqual(
      '0x5986dd957451bd806461ec4f1afeaccbb2f68f38f7a543c868ec2d4e63d9d176'
    );
    expect(pools[1].id).toEqual(
      '0xba5002423940ff7f84ae08aeea9622a1f5835a16c3fedb3dea40b92f3cfcb911'
    );
    expect(pools[1].liquidityPool.id).toEqual(
      '0x5986dd957451bd806461ec4f1afeaccbb2f68f38f7a543c868ec2d4e63d9d176'
    );
    expect(pools[2].id).toEqual(
      '0xdeb9b6682fe9239f7e03e754d98faa75512bd53f879a33c042ee9bf9b1a3f786'
    );
    expect(pools[2].liquidityPool.id).toEqual(
      '0x26962c11055f880e636f35f51c9b9be9843266d72631a55032c54c4c34ddefaf'
    );
  });

  it('should get all pools correctly', async () => {
    const poolManager = new PoolManager('mainnet');
    const pools = await poolManager.getAllPools();
    expect(pools.length).toEqual(112);
    expect(
      pools[0].poolIndex === 0 &&
        pools[0].tokenRewardPerSec === '70111752' &&
        pools[0].flxRewardPerSec === '0' &&
        pools[0].liquidityPool.id ===
          '0x26962c11055f880e636f35f51c9b9be9843266d72631a55032c54c4c34ddefaf' &&
        pools[0].totalLiquidityCoinStaked.toString() === '2186486' &&
        pools[0].isClosed
    ).toBeTruthy();
    expect(
      pools[56].poolIndex === 56 &&
        pools[56].tokenRewardPerSec === '20765947' &&
        pools[56].flxRewardPerSec === '0' &&
        pools[56].liquidityPool.id ===
          '0x1755134ed9209350b9b766eae4a8bfadf7acc77863b5f62405ea5ba7b25a3666' &&
        pools[56].totalLiquidityCoinStaked.toString() === '3600000' &&
        pools[56].isClosed
    ).toBeTruthy();
  });
});

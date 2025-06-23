import { AmmPoolManager } from './AmmPoolManager';
import { Coin } from '../core';

describe('PoolManager tests', () => {
  it(`should get pool correctly`, async () => {
    const poolManager = new AmmPoolManager('mainnet');

    const params = {
      coinX: new Coin('0x2::sui::SUI'),
      coinY: new Coin(
        '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
      ),
    };
    const pool = await poolManager.getPool(params);

    expect(
      pool.id ===
        '0x5986dd957451bd806461ec4f1afeaccbb2f68f38f7a543c868ec2d4e63d9d176'
    ).toBeTruthy();
    expect(
      pool.coins[0].equals(params.coinX) && pool.coins[1].equals(params.coinY)
    ).toBeTruthy();
  });

  it(`should multi get pools correctly`, async () => {
    const poolManager = new AmmPoolManager('mainnet');

    const params = [
      {
        coinX: new Coin('0x2::sui::SUI'),
        coinY: new Coin(
          '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
        ),
      },
      {
        coinX: new Coin(
          '0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH'
        ),
        coinY: new Coin(
          '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
        ),
      },
      {
        coinX: new Coin(
          '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
        ),
        coinY: new Coin(
          '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
        ),
      },
    ];

    const pools = await poolManager.multiGetPools(params);

    expect(
      pools[0].id ==
        '0x5986dd957451bd806461ec4f1afeaccbb2f68f38f7a543c868ec2d4e63d9d176'
    ).toBeTruthy();
    expect(
      pools[0].coins[0].equals(params[0].coinX) &&
        pools[0].coins[1].equals(params[0].coinY)
    ).toBeTruthy();

    expect(
      pools[1].id ==
        '0xd9608211b30c6bfed2c5973eaaefd85413fe864d4ff6c6701bebc81218187a32'
    ).toBeTruthy();
    expect(
      pools[1].coins[0].equals(params[1].coinX) &&
        pools[1].coins[1].equals(params[1].coinY)
    ).toBeTruthy();

    expect(
      pools[2].id ==
        '0x26962c11055f880e636f35f51c9b9be9843266d72631a55032c54c4c34ddefaf'
    ).toBeTruthy();
    expect(
      pools[2].coins[0].equals(params[2].coinX) &&
        pools[2].coins[1].equals(params[2].coinY)
    ).toBeTruthy();
  });

  it(`should multi get pools correctly`, async () => {
    const poolManager = new AmmPoolManager('mainnet');
    const pools = await poolManager.getPools();
    expect(pools.length >= 1111).toBeTruthy();
  }, 999999999);
});

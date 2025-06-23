import { AmmPositionManager } from './AmmPositionManager';
import { ADDRESS_ZERO, Coin, NETWORK, Percent } from '../core';
import { AmmPool, AmmPosition as Position } from './entities';
import { AmmPoolManager } from './AmmPoolManager';

describe('Position Manager Test', () => {
  it(`get user liquidity position`, async () => {
    const positionManager = new AmmPositionManager('mainnet');
    const positions = await positionManager.getUserPositions(
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c'
    );
    expect(positions[0].liquidity == '12985383');
    expect(positions.length > 0).toBeTruthy();
  });

  it('should calculate amountX and amountY correctly', async () => {
    const poolManager = new AmmPoolManager('mainnet');

    const pool = await poolManager.getPool({
      coinX: new Coin('0x2::sui::SUI'),
      coinY: new Coin(
        '0x6dae8ca14311574fdfe555524ea48558e3d1360d1607d1c7f98af867e3b7976c::flx::FLX'
      ),
    });

    const position = new Position({
      owner: ADDRESS_ZERO,
      pool: pool,
      liquidity: 1e6,
    });

    const burnAmounts = position.burnAmountsWithSlippage(new Percent(0));

    expect(burnAmounts.amountX.eq(position.amountX.quotient)).toBeTruthy();
    expect(burnAmounts.amountY.eq(position.amountY.quotient)).toBeTruthy();

    const positionManager = new AmmPositionManager('mainnet');
    await positionManager.decreaseLiquidity(position, {
      slippageTolerance: new Percent(1),
    });

    const resp = await positionManager._client.devInspectTransactionBlock({
      transactionBlock: positionManager._tx,
      sender:
        '0xe4c08c88aec902fb63d88ed7d8a611a4a68a9397df5e82f984a82a5a5304696d',
    });
    expect(resp.events?.[0]?.parsedJson?.['amount_x']).toEqual(
      burnAmounts.amountX.toString()
    );
    expect(resp.events?.[0]?.parsedJson?.['amount_y']).toEqual(
      burnAmounts.amountY.toString()
    );
  });

  it('should increase liquidity correctly', async () => {
    const poolManager = new AmmPoolManager('mainnet');

    const pool = await poolManager.getPool({
      coinX: new Coin('0x2::sui::SUI'),
      coinY: new Coin(
        '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
      ),
    });

    const position = Position.fromAmounts({
      owner:
        '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
      pool: pool,
      amountX: 1e9,
      amountY: 1e5,
    });

    const mintAmounts = position.mintAmountsWithSlippage(new Percent(0.0001));

    const positionManager = new AmmPositionManager('mainnet');
    await positionManager.increaseLiquidity(position, {
      slippageTolerance: new Percent(1),
    });

    const resp = await positionManager._client.devInspectTransactionBlock({
      transactionBlock: positionManager._tx,
      sender:
        '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    });

    expect(
      BigInt(resp.events?.[0]?.parsedJson?.['amount_x'])
    ).toBeGreaterThanOrEqual(BigInt(mintAmounts.amountX.toString()));
    expect(
      BigInt(resp.events?.[0]?.parsedJson?.['amount_y'])
    ).toBeGreaterThanOrEqual(BigInt(mintAmounts.amountY.toString()));
  });

  it('should create new pool correctly', async () => {
    const pool = new AmmPool({
      objectId: '',
      coins: [
        new Coin(
          '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI'
        ),
        new Coin(
          '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP'
        ),
      ],
      reserves: [0, 0],
      feeRate: 0,
      liquiditySupply: 0,
      kLast: 0,
    });

    const position = Position.fromAmounts({
      owner:
        '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
      pool: pool,
      amountX: 0,
      amountY: 0,
    });

    const mintAmounts = position.mintAmountsWithSlippage(new Percent(0.0001));

    const positionManager = new AmmPositionManager('mainnet');
    await positionManager.increaseLiquidity(position, {
      amountX: 1e9,
      amountY: 1e8,
      slippageTolerance: new Percent(1),
    });

    const resp = await positionManager._client.devInspectTransactionBlock({
      transactionBlock: positionManager._tx,
      sender:
        '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    });

    expect(
      BigInt(resp.events?.[2]?.parsedJson?.['amount_x'])
    ).toBeGreaterThanOrEqual(BigInt(mintAmounts.amountX.toString()));
    expect(
      BigInt(resp.events?.[2]?.parsedJson?.['amount_y'])
    ).toBeGreaterThanOrEqual(BigInt(mintAmounts.amountY.toString()));
  });
});

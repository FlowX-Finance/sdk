import { FaaSPositionManager as PositionManager } from './FaaSPositionManager';

describe('PositionManager tests', () => {
  it(`should get user positions correctly`, async () => {
    const positionManager = new PositionManager('mainnet');

    const owner =
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c';
    const positions = await positionManager.getUserPositions(owner);
    expect(positions.length).toEqual(2);
    expect(positions[0].id).toEqual(
      '0x42caa126c97e458e5be3a81b7e79b5c6f57a0d6f135bb5257f07d230e4f481ed'
    );
    expect(positions[0].liquidity).toEqual('62847674');
    expect(
      positions[0].pendingRewards.pendingToken.quotient.isZero() &&
        positions[0].pendingRewards.pendingFLX.quotient.isZero()
    ).toBeTruthy();
    expect(positions[0].pool.poolIndex).toEqual(69);
    expect(positions[1].id).toEqual(
      '0xedc71e26c3b528b20991f35160ad1b36433ea2e80ac4e3fa97de7f1fce1343f5'
    );
    expect(positions[1].liquidity).toEqual('5000000');
    expect(positions[1].pool.poolIndex).toEqual(108);
    expect(
      BigInt(positions[1].pendingRewards.pendingToken.quotient.toString())
    ).toBeGreaterThanOrEqual(BigInt(600000));
    expect(
      positions[1].pendingRewards.pendingFLX.quotient.isZero()
    ).toBeTruthy();
  });
});

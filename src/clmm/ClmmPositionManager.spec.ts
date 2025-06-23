import { ClmmPositionManager } from './ClmmPositionManager';
import { ClmmPoolManager } from './ClmmPoolManager';

describe('Position Manager CLMM Test', () => {
  it(`get user liquidity position`, async () => {
    const poolManager = new ClmmPoolManager('mainnet');
    const positionManager = new ClmmPositionManager('mainnet', poolManager);
    const positions = await positionManager.getUserPositions(
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c'
    );
    const positionRewards = await positionManager.getPositionReward(positions);

    for (const [pIndex, position] of positions.entries()) {
      const rewards = await position.getRewards();
      rewards.forEach((reward, rIndex) => {
        const incentiveReward =
          positionRewards[pIndex]?.incentiveReward?.[
            rIndex
          ]?.quotient.toNumber() || 0;
        const rewardValue = reward.toNumber();

        if (incentiveReward > 0) {
          const percentDiff =
            ((rewardValue - incentiveReward) / incentiveReward) * 100;
          expect(percentDiff).toBeLessThanOrEqual(0.001);
        } else {
          expect(rewardValue).toBe(0);
        }
      });
    }
  }, 30000);
});

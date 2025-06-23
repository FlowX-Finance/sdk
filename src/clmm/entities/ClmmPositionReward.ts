import BN from 'bn.js';
import { BigintIsh } from '../../core';

interface PositionRewardConstructorArgs {
  coinsOwedReward: BigintIsh;
  rewardGrowthInsideLast: BigintIsh;
}

export class ClmmPositionReward {
  public readonly coinsOwedReward: BN;
  public readonly rewardGrowthInsideLast: BN;

  constructor({
    coinsOwedReward,
    rewardGrowthInsideLast,
  }: PositionRewardConstructorArgs) {
    this.coinsOwedReward = new BN(coinsOwedReward);
    this.rewardGrowthInsideLast = new BN(rewardGrowthInsideLast);
  }
}

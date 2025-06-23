import { BigintIsh, Coin } from '../../core';

export class ClmmPoolReward {
  constructor(
    public readonly coin: Coin,
    public readonly endedAtSeconds: number,
    public readonly rewardPerSeconds: BigintIsh,
    public readonly totalReward: BigintIsh,
    public readonly lastUpdateTime: number,
    public readonly rewardGrowthGlobal: BigintIsh
  ) {
    //
  }
}

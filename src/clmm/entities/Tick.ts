import BN from 'bn.js';
import invariant from 'tiny-invariant';
import { ClmmTickMath } from '../utils';
import { BigintIsh } from '../../core';

export interface TickConstructorArgs {
  index: number;
  liquidityGross: BigintIsh;
  liquidityNet: BigintIsh;
  feeGrowthOutsideX: BigintIsh;
  feeGrowthOutsideY: BigintIsh;
  rewardGrowthsOutside: BigintIsh[];
}

export class Tick {
  public readonly index: number;
  public readonly liquidityGross: BN;
  public readonly liquidityNet: BN;
  public readonly feeGrowthOutsideX: BN;
  public readonly feeGrowthOutsideY: BN;
  public readonly rewardGrowthsOutside: BN[];

  constructor({
    index,
    liquidityGross,
    liquidityNet,
    feeGrowthOutsideX,
    feeGrowthOutsideY,
    rewardGrowthsOutside,
  }: TickConstructorArgs) {
    invariant(
      index >= ClmmTickMath.MIN_TICK && index <= ClmmTickMath.MAX_TICK,
      'TICK'
    );
    this.index = index;
    this.liquidityGross = new BN(liquidityGross);
    this.liquidityNet = new BN(liquidityNet);
    this.feeGrowthOutsideX = new BN(feeGrowthOutsideX);
    this.feeGrowthOutsideY = new BN(feeGrowthOutsideY);
    this.rewardGrowthsOutside = rewardGrowthsOutside.map(
      (item) => new BN(item)
    );
  }
}

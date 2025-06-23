import BN from 'bn.js';
import { ClmmFullMath } from './ClmmFullMath';
import { ZERO } from '../../core';

interface FeeGrowthOutside {
  feeGrowthOutsideX: BN;
  feeGrowthOutsideY: BN;
}

export abstract class TickLibrary {
  public static getFeeGrowthInside(
    feeGrowthOutsideLower: FeeGrowthOutside,
    feeGrowthOutsideUpper: FeeGrowthOutside,
    tickLower: number,
    tickUpper: number,
    tickCurrent: number,
    feeGrowthGlobalX: BN,
    feeGrowthGlobalY: BN
  ): [BN, BN] {
    let feeGrowthBelowX: BN, feeGrowthBelowY: BN;
    if (tickCurrent >= tickLower) {
      feeGrowthBelowX = feeGrowthOutsideLower.feeGrowthOutsideX;
      feeGrowthBelowY = feeGrowthOutsideLower.feeGrowthOutsideY;
    } else {
      feeGrowthBelowX = ClmmFullMath.wrappingSubIn128(
        feeGrowthGlobalX,
        feeGrowthOutsideLower.feeGrowthOutsideX
      );
      feeGrowthBelowY = ClmmFullMath.wrappingSubIn128(
        feeGrowthGlobalY,
        feeGrowthOutsideLower.feeGrowthOutsideY
      );
    }

    let feeGrowthAboveX: BN, feeGrowthAboveY: BN;
    if (tickCurrent < tickUpper) {
      feeGrowthAboveX = feeGrowthOutsideUpper.feeGrowthOutsideX;
      feeGrowthAboveY = feeGrowthOutsideUpper.feeGrowthOutsideY;
    } else {
      feeGrowthAboveX = ClmmFullMath.wrappingSubIn128(
        feeGrowthGlobalX,
        feeGrowthOutsideUpper.feeGrowthOutsideX
      );
      feeGrowthAboveY = ClmmFullMath.wrappingSubIn128(
        feeGrowthGlobalY,
        feeGrowthOutsideUpper.feeGrowthOutsideY
      );
    }

    return [
      ClmmFullMath.wrappingSubIn128(
        ClmmFullMath.wrappingSubIn128(feeGrowthGlobalX, feeGrowthBelowX),
        feeGrowthAboveX
      ),
      ClmmFullMath.wrappingSubIn128(
        ClmmFullMath.wrappingSubIn128(feeGrowthGlobalY, feeGrowthBelowY),
        feeGrowthAboveY
      ),
    ];
  }

  public static getRewardsGrowthInside(
    rewardsGrowthOutsideLower: BN[],
    rewardsGrowthOutsideUpper: BN[],
    tickLower: number,
    tickUpper: number,
    tickCurrent: number,
    rewardsGrowthGlobal: BN[]
  ): BN[] {
    let rewardsGrowthBelow: BN[];
    if (tickCurrent >= tickLower) {
      rewardsGrowthBelow = rewardsGrowthOutsideLower.slice();
    } else {
      rewardsGrowthBelow = rewardsGrowthGlobal.map(
        (rewardGrowthGlobal, idx) => {
          return ClmmFullMath.wrappingSubIn128(
            rewardGrowthGlobal,
            rewardsGrowthOutsideLower[idx] ?? ZERO
          );
        }
      );
    }

    let rewardsGrowthAbove: BN[];
    if (tickCurrent < tickUpper) {
      rewardsGrowthAbove = rewardsGrowthOutsideUpper.slice();
    } else {
      rewardsGrowthAbove = rewardsGrowthGlobal.map(
        (rewardGrowthGlobal, idx) => {
          return ClmmFullMath.wrappingSubIn128(
            rewardGrowthGlobal,
            rewardsGrowthOutsideUpper[idx] ?? ZERO
          );
        }
      );
    }

    return rewardsGrowthGlobal.map((rewardGrowthGlobal, idx) => {
      return ClmmFullMath.wrappingSubIn128(
        ClmmFullMath.wrappingSubIn128(
          rewardGrowthGlobal,
          rewardsGrowthBelow[idx] ?? ZERO
        ),
        rewardsGrowthAbove[idx] ?? ZERO
      );
    });
  }
}

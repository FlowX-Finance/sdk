import BN from 'bn.js';
import { BigintIsh, sqrtBn, ZERO } from '../../core';
import { MINIMUM_LIQUIDITY } from '../constants';

export class AmmLiquidityMath {
  static getAmountFromLiquidity(
    liquidity: BN,
    liquiditySupply: BN,
    reserve: BN
  ) {
    return liquidity.mul(reserve).div(liquiditySupply);
  }

  public static maxLiquidityForAmount(
    liquiditySupply: BN,
    reserve: BN,
    amount: BigintIsh
  ): BN {
    return new BN(amount).mul(liquiditySupply).div(reserve);
  }

  public static maxLiquidityForAmounts(
    liquiditySupply: BN,
    reserveX: BN,
    reserveY: BN,
    amountX: BigintIsh,
    amountY: BigintIsh
  ): BN {
    if (liquiditySupply.isZero()) {
      const liquid = sqrtBn(
        new BN(amountX.toString()).mul(new BN(amountY.toString()))
      );

      return liquid.sub(MINIMUM_LIQUIDITY);
    }

    const liquidity0 = AmmLiquidityMath.maxLiquidityForAmount(
      liquiditySupply,
      reserveX,
      amountX
    );
    const liquidity1 = AmmLiquidityMath.maxLiquidityForAmount(
      liquiditySupply,
      reserveY,
      amountY
    );
    return liquidity0.lt(liquidity1) ? liquidity0 : liquidity1;
  }

  public static getLiquidityFeeMintAmount(
    liquiditySupply: BN,
    reserveX: BN,
    reserveY: BN,
    kLast: BN
  ) {
    if (kLast.isZero()) {
      return ZERO;
    }

    const rootK = sqrtBn(reserveX.mul(reserveY));
    const rootKLast = sqrtBn(kLast);

    if (rootK === rootKLast) {
      return ZERO;
    }

    const numerator = liquiditySupply.mul(rootK.sub(rootKLast));
    const denominator = rootK.mul(new BN(5)).add(rootKLast);
    return numerator.div(denominator);
  }
}

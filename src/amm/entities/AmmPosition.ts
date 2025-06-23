import BN from 'bn.js';

import { AmmPool } from './AmmPool';
import {
  BigintIsh,
  Coin,
  CoinAmount,
  Fraction,
  Percent,
  ZERO,
} from '../../core';
import { AmmLiquidityMath } from '../utils';

interface PositionConstructorArgs {
  owner: string;
  pool: AmmPool;
  liquidity: BigintIsh;
}

export class AmmPosition {
  public readonly owner: string;
  public readonly pool: AmmPool;
  public readonly liquidity: BigintIsh;

  private _coinXAmount: CoinAmount<Coin> | null = null;
  private _coinYAmount: CoinAmount<Coin> | null = null;
  private _mintAmounts: Readonly<{ amountX: BN; amountY: BN }> | null = null;

  constructor({ owner, pool: pool, liquidity }: PositionConstructorArgs) {
    this.owner = owner;
    this.pool = pool;
    this.liquidity = new BN(liquidity);
  }

  public get amountX(): CoinAmount<Coin> {
    if (this._coinXAmount === null) {
      this._coinXAmount = CoinAmount.fromRawAmount(
        this.pool.coinX,
        new BN(this.pool.liquiditySupply).isZero()
          ? ZERO
          : AmmLiquidityMath.getAmountFromLiquidity(
              new BN(this.liquidity),
              new BN(this.pool.liquiditySupply).add(
                AmmLiquidityMath.getLiquidityFeeMintAmount(
                  new BN(this.pool.liquiditySupply),
                  new BN(this.pool.reserveX.quotient),
                  new BN(this.pool.reserveY.quotient),
                  new BN(this.pool.kLast)
                )
              ),
              this.pool.reserveX.quotient
            )
      );
    }
    return this._coinXAmount;
  }

  public get amountY(): CoinAmount<Coin> {
    if (this._coinYAmount === null) {
      this._coinYAmount = CoinAmount.fromRawAmount(
        this.pool.coinY,
        new BN(this.pool.liquiditySupply).isZero()
          ? ZERO
          : AmmLiquidityMath.getAmountFromLiquidity(
              new BN(this.liquidity),
              new BN(this.pool.liquiditySupply).add(
                AmmLiquidityMath.getLiquidityFeeMintAmount(
                  new BN(this.pool.liquiditySupply),
                  new BN(this.pool.reserveX.quotient),
                  new BN(this.pool.reserveY.quotient),
                  new BN(this.pool.kLast)
                )
              ),
              this.pool.reserveY.quotient
            )
      );
    }
    return this._coinYAmount;
  }

  public get mintAmounts(): Readonly<{ amountX: BN; amountY: BN }> {
    if (this._mintAmounts === null) {
      this._mintAmounts = {
        amountX: new BN(this.pool.liquiditySupply).isZero()
          ? ZERO
          : AmmLiquidityMath.getAmountFromLiquidity(
              new BN(this.liquidity),
              new BN(this.pool.liquiditySupply).add(
                AmmLiquidityMath.getLiquidityFeeMintAmount(
                  new BN(this.pool.liquiditySupply),
                  new BN(this.pool.reserveX.quotient),
                  new BN(this.pool.reserveY.quotient),
                  new BN(this.pool.kLast)
                )
              ),
              this.pool.reserveX.quotient
            ),
        amountY: new BN(this.pool.liquiditySupply).isZero()
          ? ZERO
          : AmmLiquidityMath.getAmountFromLiquidity(
              new BN(this.liquidity),
              new BN(this.pool.liquiditySupply).add(
                AmmLiquidityMath.getLiquidityFeeMintAmount(
                  new BN(this.pool.liquiditySupply),
                  new BN(this.pool.reserveX.quotient),
                  new BN(this.pool.reserveY.quotient),
                  new BN(this.pool.kLast)
                )
              ),
              this.pool.reserveY.quotient
            ),
      };
    }
    return this._mintAmounts;
  }

  public set mintAmounts(_mintAmounts: { amountX: BN; amountY: BN }) {
    this._mintAmounts = _mintAmounts;
  }

  public static fromAmounts({
    owner,
    pool,
    amountX,
    amountY,
  }: {
    owner: string;
    pool: AmmPool;
    amountX: BigintIsh;
    amountY: BigintIsh;
  }) {
    return new AmmPosition({
      owner,
      pool,
      liquidity: AmmLiquidityMath.maxLiquidityForAmounts(
        new BN(pool.liquiditySupply).add(
          AmmLiquidityMath.getLiquidityFeeMintAmount(
            new BN(pool.liquiditySupply),
            new BN(pool.reserveX.quotient),
            new BN(pool.reserveY.quotient),
            new BN(pool.kLast)
          )
        ),
        pool.reserveX.quotient,
        pool.reserveY.quotient,
        amountX,
        amountY
      ),
    });
  }

  private ratiosAfterSlippage(slippageTolerance: Percent): {
    amountX: BN;
    amountY: BN;
  } {
    const amounts = this.mintAmounts;

    const amountX = new Fraction(amounts.amountX)
      .multiply(new Percent(1).subtract(slippageTolerance))
      .toFixed(0);
    const amountY = new Fraction(amounts.amountY)
      .multiply(new Percent(1).subtract(slippageTolerance))
      .toFixed(0);

    return {
      amountX: new BN(amountX),
      amountY: new BN(amountY),
    };
  }

  public mintAmountsWithSlippage(
    slippageTolerance: Percent
  ): Readonly<{ amountX: BN; amountY: BN }> {
    const { amountX, amountY } = this.ratiosAfterSlippage(slippageTolerance);

    const positionThatWillBeCreated = AmmPosition.fromAmounts({
      owner: this.owner,
      pool: this.pool,
      amountX,
      amountY,
    });

    return {
      amountX: positionThatWillBeCreated.amountX.quotient,
      amountY: positionThatWillBeCreated.amountY.quotient,
    };
  }

  public burnAmountsWithSlippage(
    slippageTolerance: Percent
  ): Readonly<{ amountX: BN; amountY: BN }> {
    return this.ratiosAfterSlippage(slippageTolerance);
  }
}

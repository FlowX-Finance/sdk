import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, Fraction, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

export interface CetusProtocolConfig {
  wrappedRouterPackageId: string;
  globalConfigObjectId: string;
}
export interface CetusSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, CetusProtocolConfig> {
  xForY: boolean;
  sqrtPriceX64Limit: BigintIsh;
  minSqrtPriceX64HasLiquidity: BigintIsh;
  maxSqrtPriceX64HasLiquidity: BigintIsh;
}

export class CetusSwap<CInput extends Coin, COutput extends Coin> extends Swap<
  CInput,
  COutput,
  CetusProtocolConfig,
  CetusSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;
  public readonly sqrtPriceX64Limit!: BigintIsh;
  public readonly minSqrtPriceX64HasLiquidity!: BigintIsh;
  public readonly maxSqrtPriceX64HasLiquidity!: BigintIsh;

  constructor(options: CetusSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.sqrtPriceX64Limit = options.sqrtPriceX64Limit;
    this.maxSqrtPriceX64HasLiquidity = options.maxSqrtPriceX64HasLiquidity;
    this.minSqrtPriceX64HasLiquidity = options.minSqrtPriceX64HasLiquidity;
  }

  public protocol(): Protocol {
    return Protocol.CETUS;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const sqrtPriceX64LimitAdjusted = this.xForY
        ? new Fraction(this.sqrtPriceX64Limit).multiply(
            new Percent(1).subtract(slippage)
          )
        : new Fraction(this.sqrtPriceX64Limit).multiply(slippage.add(1));

      const { wrappedRouterPackageId, globalConfigObjectId } =
        this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [
          this.xForY ? this.input.coinType : this.output.coinType,
          this.xForY ? this.output.coinType : this.input.coinType,
        ],
        arguments: [
          routeObject,
          tx.object(globalConfigObjectId),
          tx.object(this.pool.id),
          tx.pure.u128(
            this.xForY
              ? Fraction.max(
                  sqrtPriceX64LimitAdjusted,
                  new Fraction(this.minSqrtPriceX64HasLiquidity)
                ).toFixed(0)
              : Fraction.min(
                  sqrtPriceX64LimitAdjusted,
                  new Fraction(this.maxSqrtPriceX64HasLiquidity)
                ).toFixed(0)
          ),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

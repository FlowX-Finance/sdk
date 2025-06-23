import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';

export interface HopFunSwapConfig {
  wrappedRouterPackageId: string;
  memeConfigObjectId: string;
}

export interface HopFunSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, HopFunSwapConfig> {
  xForY: boolean;
}

export class HopFunSwap<CInput extends Coin, COutput extends Coin> extends Swap<
  CInput,
  COutput,
  HopFunSwapConfig,
  HopFunSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: HopFunSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.HOP_FUN;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId, memeConfigObjectId } =
        this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [
          this.xForY ? this.input.coinType : this.output.coinType,
        ],
        arguments: this.xForY
          ? [
              routeObject,
              tx.object(memeConfigObjectId),
              tx.object(this.pool.id),
            ]
          : [
              routeObject,
              tx.object(memeConfigObjectId),
              tx.object(this.pool.id),
              tx.pure.u64(this.amountOut.toString()),
            ],
      });
    };
}

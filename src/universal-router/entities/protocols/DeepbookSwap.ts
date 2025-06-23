import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions, WrappedRouterConfig } from '../Swap';
import { Protocol } from '../../constants';

export interface DeepbookSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, WrappedRouterConfig> {
  xForY: boolean;
  lotSize: BigintIsh;
}

export class DeepbookSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  WrappedRouterConfig,
  DeepbookSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;
  public readonly lotSize!: BigintIsh;

  constructor(options: DeepbookSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.lotSize = options.lotSize;
  }

  public protocol(): Protocol {
    return Protocol.DEEPBOOK;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      throw new Error(
        'DeepbookSwap is not implemented yet. Please use DeepbookSwapV3 instead.'
      );
    };
}

import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions, WrappedRouterConfig } from '../Swap';
import { CONFIGS, Protocol } from '../../constants';
import { SUI_SYSTEM_STATE_OBJECT_ID } from '@mysten/sui/utils';

export interface HaedalSwapSwapOptions<
  CInput extends Coin,
  COutput extends Coin
> extends SwapConstructorOptions<CInput, COutput, WrappedRouterConfig> {
  xForY: boolean;
}

export class HaedalSwap<CInput extends Coin, COutput extends Coin> extends Swap<
  CInput,
  COutput,
  WrappedRouterConfig,
  HaedalSwapSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: HaedalSwapSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.HAEDAL;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        arguments: [
          routeObject,
          tx.object(SUI_SYSTEM_STATE_OBJECT_ID),
          tx.object(this.pool.id),
        ],
      });
    };
}

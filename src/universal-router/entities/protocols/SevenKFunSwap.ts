import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions, WrappedRouterConfig } from '../Swap';
import { Protocol } from '../../constants';

export interface SevenKFunProtocolConfig {
  wrappedRouterPackageId: string;
  configurationObjectId: string;
  flowxV2ContainerObjectId: string;
}

export interface SevenKFunSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, SevenKFunProtocolConfig> {
  xForY: boolean;
}

export class SevenKFunSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  SevenKFunProtocolConfig,
  SevenKFunSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: SevenKFunSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.SEVEN_K_FUN;
  }
  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const {
        wrappedRouterPackageId,
        configurationObjectId,
        flowxV2ContainerObjectId,
      } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [
          this.xForY ? this.input.coinType : this.output.coinType,
        ],
        arguments: this.xForY
          ? [routeObject, tx.object(configurationObjectId)]
          : [
              routeObject,
              tx.object(configurationObjectId),
              tx.object(flowxV2ContainerObjectId),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ],
      });
    };
}

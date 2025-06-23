import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

export interface BlueMoveFunProtocolConfig {
  wrappedRouterPackageId: string;
  configurationObjectId: string;
  thresholdObjectId: string;
  dexInfoObjectId: string;
}

export interface BlueMoveFunSwapOptions<
  CInput extends Coin,
  COutput extends Coin
> extends SwapConstructorOptions<CInput, COutput, BlueMoveFunProtocolConfig> {
  xForY: boolean;
}

export class BlueMoveFunSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  BlueMoveFunProtocolConfig,
  BlueMoveFunSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: BlueMoveFunSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.BLUEMOVE_FUN;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const {
        wrappedRouterPackageId,
        configurationObjectId,
        thresholdObjectId,
        dexInfoObjectId,
      } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_for_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [
          this.xForY ? this.input.coinType : this.output.coinType,
        ],
        arguments: this.xForY
          ? [
              routeObject,
              tx.object(configurationObjectId),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ]
          : [
              routeObject,
              tx.object(configurationObjectId),
              tx.object(thresholdObjectId),
              tx.object(dexInfoObjectId),
              tx.pure.u64(this.amountOut.toString()),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ],
      });
    };
}

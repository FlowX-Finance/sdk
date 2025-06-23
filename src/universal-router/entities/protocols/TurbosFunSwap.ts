import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

export interface TurbosFunProtocolConfig {
  wrappedRouterPackageId: string;
  configurationObjectId: string;
}
export interface TurbosFunSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, TurbosFunProtocolConfig> {
  xForY: boolean;
}

export class TurbosFunSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  TurbosFunProtocolConfig,
  TurbosFunSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: TurbosFunSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.TURBOS_FUN;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId, configurationObjectId } =
        this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [
          this.xForY ? this.input.coinType : this.output.coinType,
        ],
        arguments: [
          routeObject,
          tx.object(configurationObjectId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

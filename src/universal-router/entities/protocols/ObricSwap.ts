import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions, WrappedRouterConfig } from '../Swap';
import { CONFIGS, Protocol } from '../../constants';

export interface ObricSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, WrappedRouterConfig> {
  xForY: boolean;
  xPriceId: string;
  yPriceId: string;
}

export class ObricSwap<CInput extends Coin, COutput extends Coin> extends Swap<
  CInput,
  COutput,
  WrappedRouterConfig,
  ObricSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;
  public readonly xPriceId!: string;
  public readonly yPriceId!: string;

  constructor(options: ObricSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.xPriceId = options.xPriceId;
    this.yPriceId = options.yPriceId;
  }

  public protocol(): Protocol {
    return Protocol.OBRIC;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const [coinX, coinY] = [
        this.xForY ? this.input.coinType : this.output.coinType,
        this.xForY ? this.output.coinType : this.input.coinType,
      ];

      const { wrappedRouterPackageId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [coinX, coinY],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(CONFIGS[this.network].pyth.stateObjectId),
          tx.object(this.xPriceId),
          tx.object(this.yPriceId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

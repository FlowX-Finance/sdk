import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions, WrappedRouterConfig } from '../Swap';
import { Protocol } from '../../constants';
import invariant from 'tiny-invariant';

export interface HaedalPMMSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, WrappedRouterConfig> {
  xForY: boolean;
}

export class HaedalPMMSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  WrappedRouterConfig,
  HaedalPMMSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: HaedalPMMSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.HAEDAL_PMM;
  }

  public swap =
    (
      routeObject: TransactionResult,
      slippage: Percent,
      pythMap: Record<string, string>
    ) =>
    (tx: Transaction): void => {
      const [coinX, coinY] = [
        this.xForY ? this.input.coinType : this.output.coinType,
        this.xForY ? this.output.coinType : this.input.coinType,
      ];
      const [priceFeedObjectIdX, priceFeedObjectIdY] = [
        this.oracles?.[0]?.priceId
          ? pythMap[this.oracles[0].priceId]
          : undefined,
        this.oracles?.[1]?.priceId
          ? pythMap[this.oracles[1].priceId]
          : undefined,
      ];
      invariant(
        priceFeedObjectIdX && priceFeedObjectIdY,
        'Price feed object IDs must be defined for both coins'
      );

      const { wrappedRouterPackageId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        typeArguments: [coinX, coinY],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(priceFeedObjectIdX),
          tx.object(priceFeedObjectIdY),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

export interface FlowxPmmProtocolConfig {
  sourcePackageId: string;
  wrappedRouterPackageId: string;
  stateObjectId: string;
}

interface FlowxPmmSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, FlowxPmmProtocolConfig> {
  xForY: boolean;
  swapTimestampMs: number;
  signatures: string[];
}

export class FlowxPmmSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  FlowxPmmProtocolConfig,
  FlowxPmmSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;
  public readonly swapTimestampMs!: number;
  public readonly signatures!: string[];

  constructor(options: FlowxPmmSwapOptions<CInput, COutput>) {
    super(options);

    this.xForY = options.xForY;
    this.swapTimestampMs = options.swapTimestampMs;
    this.signatures = options.signatures;
  }

  public protocol(): Protocol {
    return Protocol.FLOWX_PMM;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { sourcePackageId, wrappedRouterPackageId, stateObjectId } =
        this.protocolConfig;
      const quote = tx.moveCall({
        target: `${sourcePackageId}::quote::new`,
        typeArguments: [this.input.coinType, this.output.coinType],
        arguments: [
          tx.pure.u64(this.amountIn.toString()),
          tx.pure.u64(this.amountOut.toString()),
          tx.pure.u64(this.swapTimestampMs),
        ],
      });

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
          tx.object(stateObjectId),
          tx.object(this.pool.id),
          quote,
          tx.pure(
            bcs
              .vector(bcs.vector(bcs.u8()))
              .serialize(
                this.signatures.map((item) =>
                  bcs.bytes(item.replace('0x', '').length / 2).fromHex(item)
                )
              )
          ),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

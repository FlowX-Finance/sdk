import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_SYSTEM_STATE_OBJECT_ID } from '@mysten/sui/utils';

export interface VoloLsdProtocolConfig {
  wrappedRouterPackageId: string;
  vSuiMetadataObjectId: string;
}

export interface VoloLsdSwapSwapOptions<
  CInput extends Coin,
  COutput extends Coin
> extends SwapConstructorOptions<CInput, COutput, VoloLsdProtocolConfig> {
  xForY: boolean;
}

export class VoloLsdSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  VoloLsdProtocolConfig,
  VoloLsdSwapSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: VoloLsdSwapSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.VOLO_LSD;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId, vSuiMetadataObjectId } =
        this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(vSuiMetadataObjectId),
          tx.object(SUI_SYSTEM_STATE_OBJECT_ID),
        ],
      });
    };
}

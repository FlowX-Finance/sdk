import { Coin, Percent } from '../../../core';
import { Protocol } from '../../constants';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';

export interface BlueMoveProtocolConfig {
  wrappedRouterPackageId: string;
  dexInfoObjectId: string;
}

export class BluemoveSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  BlueMoveProtocolConfig,
  SwapConstructorOptions<CInput, COutput, BlueMoveProtocolConfig>
> {
  public protocol(): Protocol {
    return Protocol.BLUEMOVE;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId, dexInfoObjectId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::swap_exact_input`,
        typeArguments: [this.input.coinType, this.output.coinType],
        arguments: [routeObject, tx.object(dexInfoObjectId)],
      });
    };
}

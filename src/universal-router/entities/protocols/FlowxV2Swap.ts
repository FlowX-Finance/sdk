import { Coin, Percent } from '../../../core';
import { Protocol } from '../../constants';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';

export interface FlowxV2ProtocolConfig {
  wrappedRouterPackageId: string;
  containerObjectId: string;
}

export class FlowxV2Swap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  FlowxV2ProtocolConfig,
  SwapConstructorOptions<CInput, COutput, FlowxV2ProtocolConfig>
> {
  public protocol(): Protocol {
    return Protocol.FLOWX_V2;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId, containerObjectId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::swap_exact_input`,
        typeArguments: [this.input.coinType, this.output.coinType],
        arguments: [routeObject, tx.object(containerObjectId)],
      });
    };
}

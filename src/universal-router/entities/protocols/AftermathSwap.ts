import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';

export interface AftermathProtocolConfig {
  wrappedRouterPackageId: string;
  poolRegistryObjectId: string;
  protocolFeeVaultObjectId: string;
  treasuryObjectId: string;
  insuranceFundObjectId: string;
  referralVaultOjectId: string;
}
export interface AftermathSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, AftermathProtocolConfig> {
  lpCoinType: string;
}

export class AftermathSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  AftermathProtocolConfig,
  AftermathSwapOptions<CInput, COutput>
> {
  public readonly lpCoinType!: string;
  constructor(options: AftermathSwapOptions<CInput, COutput>) {
    super(options);
    this.lpCoinType = options.lpCoinType;
  }

  public protocol(): Protocol {
    return Protocol.AFTERMATH;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const {
        wrappedRouterPackageId,
        poolRegistryObjectId,
        protocolFeeVaultObjectId,
        treasuryObjectId,
        insuranceFundObjectId,
        referralVaultOjectId,
      } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::swap_exact_input`,
        typeArguments: [
          this.lpCoinType,
          this.input.coinType,
          this.output.coinType,
        ],
        arguments: [
          routeObject,
          tx.object(poolRegistryObjectId),
          tx.object(this.pool.id),
          tx.object(protocolFeeVaultObjectId),
          tx.object(treasuryObjectId),
          tx.object(insuranceFundObjectId),
          tx.object(referralVaultOjectId),
          tx.pure.u64(this.amountOut.toString()),
        ],
      });
    };
}

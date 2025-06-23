import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import BigNumber from 'bignumber.js';

export interface DeepbookV3ProtocolConfig {
  wrappedRouterPackageId: string;
  treasuryObjectId: string;
}

export interface DeepbookV3SwapOptions<
  CInput extends Coin,
  COutput extends Coin
> extends SwapConstructorOptions<CInput, COutput, DeepbookV3ProtocolConfig> {
  xForY: boolean;
  deepFeeAmount: BigintIsh;
}

export class DeepbookV3Swap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  DeepbookV3ProtocolConfig,
  DeepbookV3SwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;
  public readonly deepFeeAmount!: BigintIsh;

  constructor(options: DeepbookV3SwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.deepFeeAmount = new BigNumber(options.deepFeeAmount.toString())
      .multipliedBy(120)
      .dividedBy(100)
      .toFixed(0);
  }

  public protocol(): Protocol {
    return Protocol.DEEPBOOK_V3;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const { wrappedRouterPackageId, treasuryObjectId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,

        typeArguments: [
          this.xForY ? this.input.coinType : this.output.coinType,
          this.xForY ? this.output.coinType : this.input.coinType,
        ],
        arguments: [
          tx.object(treasuryObjectId),
          routeObject,
          tx.object(this.pool.id),
          tx.pure.u64(this.deepFeeAmount.toString()),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };
}

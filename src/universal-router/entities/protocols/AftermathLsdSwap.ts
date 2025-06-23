import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { SUI_SYSTEM_STATE_OBJECT_ID } from '@mysten/sui/utils';

export interface AftermathLsdProtocolConfig {
  wrappedRouterPackageId: string;
  afSuiSafeTreasuryCapObjectId: string;
  referralVaultObjectId: string;
  treasuryObjectId: string;
  validatorAddr: string;
}

export interface AftermathLsdSwapSwapOptions<
  CInput extends Coin,
  COutput extends Coin
> extends SwapConstructorOptions<CInput, COutput, AftermathLsdProtocolConfig> {
  xForY: boolean;
}

export class AftermathLsdSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  AftermathLsdProtocolConfig,
  AftermathLsdSwapSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;

  constructor(options: AftermathLsdSwapSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public protocol(): Protocol {
    return Protocol.AFTERMATH_LSD;
  }

  public swap =
    (routeObject: TransactionResult, slippage: Percent) =>
    (tx: Transaction): void => {
      const {
        wrappedRouterPackageId,
        afSuiSafeTreasuryCapObjectId,
        referralVaultObjectId,
        treasuryObjectId,
        validatorAddr,
      } = this.protocolConfig;

      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'swap_exact_x_to_y' : 'swap_exact_y_to_x'
        }`,
        arguments: this.xForY
          ? [
              routeObject,
              tx.object(this.pool.id),
              tx.object(afSuiSafeTreasuryCapObjectId),
              tx.object(referralVaultObjectId),
              tx.object(treasuryObjectId),
            ]
          : [
              routeObject,
              tx.object(this.pool.id),
              tx.object(afSuiSafeTreasuryCapObjectId),
              tx.object(SUI_SYSTEM_STATE_OBJECT_ID),
              tx.object(referralVaultObjectId),
              tx.pure.address(validatorAddr),
            ],
      });
    };
}

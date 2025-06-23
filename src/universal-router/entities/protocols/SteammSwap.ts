import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import {
  normalizeStructTag,
  parseStructTag,
  SUI_CLOCK_OBJECT_ID,
} from '@mysten/sui/utils';
import invariant from 'tiny-invariant';

import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { OracleInfo, OracleType, SteammQuoterType } from '../../types';

export interface SteammProtocolConfig {
  wrappedRouterPackageId: string;
  oraclePackageId: string;
  oracleRegistryId: string;
  versionObjectId: string;
}
export interface SteammSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput, SteammProtocolConfig> {
  xForY: boolean;
  bankX: string;
  bankY: string;
  bankXStructTag: string;
  bankYStructTag: string;
  lendingMarketX: string;
  lendingMarketY: string;
  poolStructTag: string;
  quoterType: SteammQuoterType;
}

export interface SteammPoolInfo {
  poolId: string;
  lpTokenType: string;
}
export interface SteammBankInfo {
  bankId: string;
  lendingMarketId: string;
  nativeCoinType: string;
  lendingMarketType: string;
  bTokenType: string;
}

export class SteammSwap<CInput extends Coin, COutput extends Coin> extends Swap<
  CInput,
  COutput,
  SteammProtocolConfig,
  SteammSwapOptions<CInput, COutput>
> {
  private _handlers: {
    [key: string]: (
      poolInfo: SteammPoolInfo,
      bankX: SteammBankInfo,
      bankY: SteammBankInfo,
      pythMap: Record<string, string>
    ) => (routeObject: TransactionResult, tx: Transaction) => void;
  } = {};
  public readonly xForY!: boolean;
  public readonly quoterType!: SteammQuoterType;
  public readonly bankXInfo!: SteammBankInfo;
  public readonly bankYInfo!: SteammBankInfo;
  public readonly poolInfo!: SteammPoolInfo;

  constructor(options: SteammSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.quoterType = options.quoterType;

    const bankXTypeParams = parseStructTag(options.bankXStructTag).typeParams;
    const bankYTypeParams = parseStructTag(options.bankYStructTag).typeParams;
    const poolTypeParams = parseStructTag(options.poolStructTag).typeParams;

    this.bankXInfo = {
      bankId: options.bankX,
      lendingMarketId: options.lendingMarketX,
      nativeCoinType: normalizeStructTag(bankXTypeParams[1]),
      bTokenType: normalizeStructTag(bankXTypeParams[2]),
      lendingMarketType: normalizeStructTag(bankXTypeParams[0]),
    };
    this.bankYInfo = {
      bankId: options.bankY,
      lendingMarketId: options.lendingMarketY,
      nativeCoinType: normalizeStructTag(bankYTypeParams[1]),
      bTokenType: normalizeStructTag(bankYTypeParams[2]),
      lendingMarketType: normalizeStructTag(bankYTypeParams[0]),
    };
    this.poolInfo = {
      poolId: this.pool.id,
      lpTokenType: normalizeStructTag(
        poolTypeParams[poolTypeParams.length - 1]
      ),
    };

    this._handlers = {
      [SteammQuoterType.CONSTANT_PRODUCT]: this.cpmmSwap.bind(this),
      [SteammQuoterType.ORACLE]: this.ommSwap.bind(this),
      [SteammQuoterType.ORACLE_V2]: this.ommV2Swap.bind(this),
    };
  }

  public protocol(): Protocol {
    return Protocol.STEAMM;
  }

  private cpmmSwap =
    (poolInfo: SteammPoolInfo, bankX: SteammBankInfo, bankY: SteammBankInfo) =>
    (routeObject: TransactionResult, tx: Transaction) => {
      const { wrappedRouterPackageId } = this.protocolConfig;

      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'cpmm_swap_exact_x_to_y' : 'cpmm_swap_exact_y_to_x'
        }`,
        typeArguments: [
          bankX.lendingMarketType,
          bankX.nativeCoinType,
          bankY.nativeCoinType,
          bankX.bTokenType,
          bankY.bTokenType,
          poolInfo.lpTokenType,
        ],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(bankX.bankId),
          tx.object(bankY.bankId),
          tx.object(bankX.lendingMarketId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };

  private getOraclePriceUpdate =
    (oracleInfo: OracleInfo, pythMap: Record<string, string>) =>
    (tx: Transaction) => {
      const { oraclePackageId, oracleRegistryId } = this.protocolConfig;
      const priceObjectId = pythMap[oracleInfo?.priceId];
      invariant(
        priceObjectId && oracleInfo.oracleIndex !== undefined,
        `Price object ID and oracle index must be defined for oracle type ${oracleInfo.oracleType}`
      );

      switch (oracleInfo.oracleType) {
        case OracleType.PYTH:
          return tx.moveCall({
            target: `${oraclePackageId}::oracles::get_pyth_price`,
            arguments: [
              tx.object(oracleRegistryId),
              tx.object(priceObjectId),
              tx.pure.u64(oracleInfo.oracleIndex!),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ],
          });
        default:
          throw new Error(`Unsupported oracle type: ${oracleInfo.oracleType}`);
      }
    };

  private getOraclePriceUpdates =
    (pythMap: Record<string, string>) => (tx: Transaction) => {
      const [oracleInfoX, oracleInfoY] = this.oracles || [];
      const [oraclePriceUpdateX, oraclePriceUpdateY] = [
        this.getOraclePriceUpdate(oracleInfoX, pythMap)(tx),
        this.getOraclePriceUpdate(oracleInfoY, pythMap)(tx),
      ];

      return [oraclePriceUpdateX, oraclePriceUpdateY];
    };

  private ommSwap =
    (
      poolInfo: SteammPoolInfo,
      bankX: SteammBankInfo,
      bankY: SteammBankInfo,
      pythMap: Record<string, string>
    ) =>
    (routeObject: TransactionResult, tx: Transaction) => {
      const [oraclePriceUpdateX, oraclePriceUpdateY] =
        this.getOraclePriceUpdates(pythMap)(tx);

      const { wrappedRouterPackageId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'omm_swap_exact_x_to_y' : 'omm_swap_exact_y_to_x'
        }`,
        typeArguments: [
          bankX.lendingMarketType,
          bankX.nativeCoinType,
          bankY.nativeCoinType,
          bankX.bTokenType,
          bankY.bTokenType,
          poolInfo.lpTokenType,
        ],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(bankX.bankId),
          tx.object(bankY.bankId),
          tx.object(bankX.lendingMarketId),
          oraclePriceUpdateX,
          oraclePriceUpdateY,
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };

  private ommV2Swap =
    (
      poolInfo: SteammPoolInfo,
      bankX: SteammBankInfo,
      bankY: SteammBankInfo,
      pythMap: Record<string, string>
    ) =>
    (routeObject: TransactionResult, tx: Transaction) => {
      const [oraclePriceUpdateX, oraclePriceUpdateY] =
        this.getOraclePriceUpdates(pythMap)(tx);

      const { wrappedRouterPackageId } = this.protocolConfig;
      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::${
          this.xForY ? 'omm_v2_swap_exact_x_to_y' : 'omm_v2_swap_exact_y_to_x'
        }`,
        typeArguments: [
          bankX.lendingMarketType,
          bankX.nativeCoinType,
          bankY.nativeCoinType,
          bankX.bTokenType,
          bankY.bTokenType,
          poolInfo.lpTokenType,
        ],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(bankX.bankId),
          tx.object(bankY.bankId),
          tx.object(bankX.lendingMarketId),
          oraclePriceUpdateX,
          oraclePriceUpdateY,
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    };

  public swap =
    (
      routeObject: TransactionResult,
      slippage: Percent,
      pythMap: Record<string, string>
    ) =>
    (tx: Transaction): void => {
      const handler = this._handlers[this.quoterType];
      invariant(
        handler && typeof handler === 'function',
        `unsupported quoter with type=${this.quoterType}`
      );

      handler(
        this.poolInfo,
        this.bankXInfo,
        this.bankYInfo,
        pythMap
      )(routeObject, tx);
    };
}

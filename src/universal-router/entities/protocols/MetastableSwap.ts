import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import invariant from 'tiny-invariant';
import { isNil } from 'lodash';

import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Protocol } from '../../constants';
import { IMetaCapacityCreator } from '../helpers/metastable/IMetaCapicityCreator';
import {
  METHCapacityCreator,
  MUSDCapacityCreator,
  SuperSUICapacityCreator,
} from '../helpers';

enum Action {
  SWAP_COIN_TO_META_COIN,
  SWAP_META_COIN_TO_COIN,
  SWAP_COIN_TO_COIN,
}

export interface MetastableRouterConfig {
  wrappedRouterPackageId: string;
  versionObjectId: string;
  superSUIVault: {
    vaultId: string;
    metaCoinType: string;
  };
  mUSDVault: {
    vaultId: string;
    metaCoinType: string;
  };
  mETHVault: {
    vaultId: string;
    metaCoinType: string;
  };
}

export class MetastableSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<
  CInput,
  COutput,
  MetastableRouterConfig,
  SwapConstructorOptions<CInput, COutput, MetastableRouterConfig>
> {
  private mappingMetaCoinType: { [k: string]: string } = {};
  private capacityCapCreators: { [k: string]: IMetaCapacityCreator } = {};
  private routers: {
    [k: string]: (
      routeObject: TransactionResult,
      config: any
    ) => (tx: Transaction) => void;
  } = {};

  constructor(
    options: SwapConstructorOptions<CInput, COutput, MetastableRouterConfig>
  ) {
    super(options);

    const { superSUIVault, mUSDVault, mETHVault } = this.protocolConfig;

    this.mappingMetaCoinType[superSUIVault.vaultId] =
      superSUIVault.metaCoinType;
    this.mappingMetaCoinType[mUSDVault.vaultId] = mUSDVault.metaCoinType;
    this.mappingMetaCoinType[mETHVault.vaultId] = mETHVault.metaCoinType;

    this.capacityCapCreators[superSUIVault.vaultId] =
      new SuperSUICapacityCreator();
    this.capacityCapCreators[mUSDVault.vaultId] = new MUSDCapacityCreator();
    this.capacityCapCreators[mETHVault.vaultId] = new METHCapacityCreator();

    this.routers[Action.SWAP_COIN_TO_META_COIN] =
      this.swapCoinToMetaCoin.bind(this);
    this.routers[Action.SWAP_META_COIN_TO_COIN] =
      this.swapMetaCoinToCoin.bind(this);
    this.routers[Action.SWAP_COIN_TO_COIN] = this.swapCoinToCoin.bind(this);
  }

  public protocol(): Protocol {
    return Protocol.METASTABLE;
  }

  private swapCoinToMetaCoin =
    (routeObject: TransactionResult, pythMap: Record<string, string>) =>
    (tx: Transaction) => {
      const capacityCapCreator = this.capacityCapCreators[this.pool.id];
      const metaCoinType = this.mappingMetaCoinType[this.pool.id];
      invariant(capacityCapCreator && metaCoinType, 'invalid meta vault');

      const { wrappedRouterPackageId, versionObjectId } = this.protocolConfig;

      const depositCap = capacityCapCreator.createDepositCap(
        this.input.coinType,
        { ...this.protocolConfig, oracles: this.oracles, pythMap }
      )(tx);

      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::swap_exact_coin_to_meta_coin`,
        typeArguments: [metaCoinType, this.input.coinType],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(versionObjectId),
          depositCap,
        ],
      });
    };

  private swapMetaCoinToCoin =
    (routeObject: TransactionResult, pythMap: Record<string, string>) =>
    (tx: Transaction) => {
      const capacityCapCreator = this.capacityCapCreators[this.pool.id];
      const metaCoinType = this.mappingMetaCoinType[this.pool.id];
      invariant(capacityCapCreator && metaCoinType, 'invalid meta vault');

      const { wrappedRouterPackageId, versionObjectId } = this.protocolConfig;

      const withdrawCap = capacityCapCreator.createWithdrawCap(
        this.output.coinType,
        { ...this.protocolConfig, oracles: this.oracles, pythMap }
      )(tx);

      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::swap_exact_meta_coin_to_coin`,
        typeArguments: [metaCoinType, this.output.coinType],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(versionObjectId),
          withdrawCap,
        ],
      });
    };

  private swapCoinToCoin =
    (routeObject: TransactionResult, pythMap: Record<string, string>) =>
    (tx: Transaction) => {
      const capacityCapCreator = this.capacityCapCreators[this.pool.id];
      const metaCoinType = this.mappingMetaCoinType[this.pool.id];
      invariant(capacityCapCreator && metaCoinType, 'invalid meta vault');

      const { wrappedRouterPackageId, versionObjectId } = this.protocolConfig;

      const depositCap = capacityCapCreator.createDepositCap(
        this.input.coinType,
        { ...this.protocolConfig, oracles: this.oracles, pythMap }
      )(tx);
      const withdrawCap = capacityCapCreator.createWithdrawCap(
        this.output.coinType,
        { ...this.protocolConfig, oracles: this.oracles?.slice(1), pythMap }
      )(tx);

      tx.moveCall({
        target: `${wrappedRouterPackageId}::swap_router::swap_exact_input`,
        typeArguments: [
          metaCoinType,
          this.input.coinType,
          this.output.coinType,
        ],
        arguments: [
          routeObject,
          tx.object(this.pool.id),
          tx.object(versionObjectId),
          depositCap,
          withdrawCap,
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
      const metaCoinType = this.mappingMetaCoinType[this.pool.id];

      let action: Action | undefined;
      if (this.input.coinType !== metaCoinType) {
        action = Action.SWAP_COIN_TO_META_COIN;
      }

      if (this.output.coinType !== metaCoinType) {
        action = isNil(action)
          ? Action.SWAP_META_COIN_TO_COIN
          : Action.SWAP_COIN_TO_COIN;
      }

      const router = this.routers[action as Action];
      invariant(router, 'invalid routing');

      router(routeObject, pythMap)(tx);
    };
}

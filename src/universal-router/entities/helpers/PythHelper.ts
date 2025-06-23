import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { uniq } from 'lodash';

import { Coin } from '../../../core';
import { Route } from '../Route';
import { SuiPriceServiceConnection, SuiPythClient } from '../pyth';
import { OracleInfo, OracleType } from '../../types';
import objectHash from 'object-hash';

interface PythConfig {
  priceServiceEndpoint: string;
  pythStateObjectId: string;
  wormholeStateObjectId: string;
}

interface PythHelperConstructorOptions {
  client: SuiClient;
  pythConfig: PythConfig;
}

export class PythHelper {
  private _pythPriceServiceConnection: SuiPriceServiceConnection;
  private _pythClient: SuiPythClient;
  private static _instances: { [key: string]: PythHelper } = {};

  constructor(options: PythHelperConstructorOptions) {
    this._pythPriceServiceConnection = new SuiPriceServiceConnection(
      options.pythConfig.priceServiceEndpoint,
      { timeout: 30000 }
    );
    this._pythClient = new SuiPythClient(
      options.client,
      options.pythConfig.pythStateObjectId,
      options.pythConfig.wormholeStateObjectId
    );
  }

  static getInstance(options: PythHelperConstructorOptions): PythHelper {
    const key = objectHash(options);

    let instance = PythHelper._instances[key];
    if (!instance) {
      instance = new PythHelper(options);
      PythHelper._instances[key] = instance;
    }

    return instance;
  }

  async updatePythPriceFeedsIfNecessary(
    routes: Route<Coin, Coin>[],
    tx: Transaction
  ): Promise<{ [key: string]: string }> {
    const oracles = routes.reduce((acc, route) => {
      return acc.concat(route.paths.map((path) => path.oracles || []).flat());
    }, new Array<OracleInfo>());

    const pythOracles = oracles.filter(
      (oracle) => oracle.oracleType === OracleType.PYTH
    );

    if (pythOracles.length === 0) {
      return {};
    }

    const uniquePriceIds = uniq(pythOracles.map((oracle) => oracle.priceId));

    const priceFeedsUpdateData =
      await this._pythPriceServiceConnection.getPriceFeedsUpdateData(
        uniquePriceIds
      );

    const priceFeedObjectIds = await this._pythClient.updatePriceFeeds(
      tx,
      priceFeedsUpdateData,
      uniquePriceIds
    );

    const priceFeedObjectIdMap: { [key: string]: string } = {};
    uniquePriceIds.forEach((priceId, idx) => {
      priceFeedObjectIdMap[priceId] = priceFeedObjectIds[idx];
    });

    return priceFeedObjectIdMap;
  }
}

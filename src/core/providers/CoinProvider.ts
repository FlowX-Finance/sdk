import _ from 'lodash';
import CryptoJS from 'crypto-js';
import { normalizeStructTag } from '@mysten/sui/utils';

import { Coin } from '../entities';
import { Pagination } from '../types/Pagination';
import { Sortation } from '../types/Sortation';
import { GraphqlProvider } from './GraphqlProvider';
import { multiGetCoins, queryCoins } from './graphql/queryCoins';
import { standardShortCoinType } from '../utils/standardShortCoinType';
import { sdkCache } from '../cache';
import { NETWORK } from '../constants';

const CACHE_TTL = 60;

export type CoinFilter = {
  isVerified?: boolean;
  coinTypes?: string[];
  searchKey?: string;
} & Pagination &
  Sortation;

export interface ICoinProvider {
  getCoins(filter: CoinFilter): Promise<Coin[] | undefined>;
}

export class CoinProvider implements ICoinProvider {
  public readonly graphqlProvider!: GraphqlProvider;

  constructor(network: NETWORK = 'mainnet') {
    this.graphqlProvider = new GraphqlProvider(network);
  }

  async getCoins(filter?: CoinFilter): Promise<Coin[] | undefined> {
    const variables = {
      size: filter?.limit ?? 10,
      page: filter?.page ?? 1,
      isVerified: filter?.isVerified,
      coinTypes: filter?.coinTypes?.map((type) => standardShortCoinType(type)),
      sortBy: filter?.sortBy ?? 'createdAt',
      sortDirection: filter?.sortDirection ?? 'asc',
      searchKey: filter?.searchKey,
    };
    const key = `QUERY_COIN ${CryptoJS.MD5(
      JSON.stringify(_.values(variables))
    )}`;

    let response = sdkCache.get(key);

    if (!response) {
      response = await this.graphqlProvider.client.request(queryCoins, {
        size: filter?.limit ?? 10,
        page: filter?.page ?? 1,
        isVerified: filter?.isVerified,
        coinTypes: filter?.coinTypes?.map((type) =>
          standardShortCoinType(type)
        ),
        sortBy: filter?.sortBy ?? 'createdAt',
        sortDirection: filter?.sortDirection ?? 'asc',
        searchKey: filter?.searchKey,
      });

      sdkCache.set(
        `QUERY_COIN ${CryptoJS.MD5(JSON.stringify(_.values(variables)))}`,
        response
      );
    }

    const listCoins: Coin[] = [];
    (response as any).queryCoins.items.map((it: any) => {
      listCoins.push(
        new Coin(
          it.type,
          it.decimals,
          it.symbol,
          it.name,
          it.description,
          it.iconUrl,
          it.derivedPriceInUSD,
          it.derivedSUI,
          it.isVerified
        )
      );
    });

    return listCoins;
  }

  async multiGetCoins(
    coinTypes: string[],
    refreshCache = false
  ): Promise<Coin[]> {
    const key = `MULTI_GET_COINS_${CryptoJS.MD5(
      JSON.stringify(_.values(coinTypes))
    )}`;

    if (!refreshCache) {
      const cached = sdkCache.get<Coin[]>(key);
      if (cached) {
        return cached;
      }
    }

    const res: any = await this.graphqlProvider.client.request(multiGetCoins, {
      coinTypes,
    });
    const coins = res.multiGetCoins.map(
      (item: any) =>
        new Coin(
          item.type,
          item.decimals,
          item.symbol,
          item.name,
          item.description,
          item.iconUrl,
          item.markets.price,
          '0',
          item.isVerified
        )
    );
    sdkCache.set(key, coins, CACHE_TTL);

    return coins;
  }

  async multiGetPrices(
    coinTypes: string[],
    refreshCache = false
  ): Promise<number[]> {
    const coins = await this.multiGetCoins(coinTypes, refreshCache);
    const mappingPrice = coins.reduce((memo: any, coin) => {
      memo[coin.coinType] = Number(coin.derivedPriceInUSD);
      return memo;
    }, {});

    return coinTypes.map(
      (coinType) => mappingPrice[normalizeStructTag(coinType)] ?? 0
    );
  }
}

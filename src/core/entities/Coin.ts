import invariant from 'tiny-invariant';
import {
  SUI_TYPE_ARG,
  normalizeStructTag,
  parseStructTag,
} from '@mysten/sui/utils';
import { isSortedSymbols } from '../utils/compareCoins';
import { BigintIsh, ZERO } from '../constants';
import { Transaction } from '@mysten/sui/transactions';
import { CoinStruct, SuiClient } from '@mysten/sui/client';
import { BN } from 'bn.js';

export class Coin {
  public readonly coinType!: string;

  public readonly decimals!: number;

  public readonly symbol?: string | undefined;

  public readonly name?: string | undefined;

  public readonly description?: string | undefined;

  public readonly iconUrl?: string | undefined;

  public readonly derivedPriceInUSD?: string | undefined;

  public readonly derivedSUI?: string | undefined;

  public readonly isVerified?: boolean | undefined;

  constructor(
    coinType: string,
    decimals?: number,
    symbol?: string,
    name?: string,
    description?: string,
    iconUrl?: string,
    derivedPriceInUSD?: string,
    derivedSUI?: string,
    isVerified?: boolean
  ) {
    parseStructTag(coinType);
    invariant(
      !decimals ||
        (decimals >= 0 && decimals < 255 && Number.isInteger(decimals)),
      'DECIMALS'
    );

    this.coinType = normalizeStructTag(coinType);
    this.decimals = decimals || 0;
    this.symbol = symbol;
    this.name = name;
    this.description = description;
    this.iconUrl = iconUrl;
    this.derivedPriceInUSD = derivedPriceInUSD;
    this.derivedSUI = derivedSUI;
    this.isVerified = isVerified;
  }

  public sortsBefore(other: Coin): boolean {
    invariant(
      this.coinType.toLowerCase() !== other.coinType.toLowerCase(),
      'COIN_TYPES'
    );

    return isSortedSymbols(
      this.coinType.toLowerCase(),
      other.coinType.toLowerCase()
    );
  }

  public wrapped(): Coin {
    return this;
  }

  public equals(other: Coin) {
    return this.coinType === other.coinType;
  }

  public async fetchAllOwnedCoins(params: {
    owner: string;
    client: SuiClient;
  }) {
    const coins: CoinStruct[] = [];
    let cursor,
      hasNextPage = false;

    do {
      const resp = await params.client.getCoins({
        owner: params.owner,
        coinType: this.coinType,
        cursor,
      });

      coins.push(...resp.data);
      cursor = resp.nextCursor;
      hasNextPage = resp.hasNextPage;
    } while (hasNextPage);

    return coins;
  }

  /**
   * @deprecated use CoinWithBalance instead
   */
  public async take(params: {
    owner: string;
    amount: BigintIsh;
    tx: Transaction;
    client: SuiClient;
    isDevInspect?: boolean;
  }) {
    const { owner, amount, tx, client, isDevInspect } = params;
    const ownedCoins = await this.fetchAllOwnedCoins({
      owner,
      client,
    });

    const totalBalance = ownedCoins.reduce(
      (memo, coin) => memo.add(new BN(coin.balance)),
      ZERO
    );

    invariant(totalBalance.gte(new BN(amount.toString())), 'IF');

    if (this.coinType === normalizeStructTag(SUI_TYPE_ARG) && !isDevInspect) {
      tx.setGasPayment(
        ownedCoins.map((coin) => ({
          digest: coin.digest,
          objectId: coin.coinObjectId,
          version: coin.version,
        }))
      );

      const [splitted] = tx.splitCoins(tx.gas, [amount.toString()]);

      return splitted;
    } else {
      if (ownedCoins.length > 1) {
        tx.mergeCoins(
          ownedCoins[0].coinObjectId,
          ownedCoins.slice(1).map((coin) => coin.coinObjectId)
        );
      }

      const [splitted] = tx.splitCoins(ownedCoins[0].coinObjectId, [
        amount.toString(),
      ]);

      return splitted;
    }
  }
}

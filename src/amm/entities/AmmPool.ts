import invariant from 'tiny-invariant';
import { BasePool, BigintIsh, Coin, NETWORK } from '../../core';
import { CoinAmount } from '../../core/entities/CoinAmount';
import { MAPPING_PACKAGE_ID } from '../constants';

interface PairConstructorArgs {
  objectId: string;
  coins: Coin[];
  reserves: BigintIsh[];
  feeRate: number;
  liquiditySupply: BigintIsh;
  kLast: BigintIsh;
}

export class AmmPool extends BasePool {
  public readonly feeRate!: number;
  public readonly liquiditySupply!: BigintIsh;
  public readonly kLast!: BigintIsh;

  constructor({
    objectId,
    coins,
    reserves,
    feeRate,
    liquiditySupply,
    kLast,
  }: PairConstructorArgs) {
    invariant(coins.length === 2, 'COINS_LENGTH');

    coins = coins[0].sortsBefore(coins[1])
      ? [coins[0], coins[1]]
      : [coins[1], coins[0]];

    super(objectId, coins, reserves);
    this.feeRate = feeRate;
    this.liquiditySupply = liquiditySupply;
    this.kLast = kLast;
  }

  public static getPoolIdentifier(coinX: Coin, coinY: Coin): string {
    [coinX, coinY] = coinX.sortsBefore(coinY) ? [coinX, coinY] : [coinY, coinX];
    return `LP-${coinX.coinType.replace('0x', '')}-${coinY.coinType.replace(
      '0x',
      ''
    )}`;
  }

  public static getLiquidityCoinType(
    coinX: Coin,
    coinY: Coin,
    network: NETWORK
  ): string {
    return `${MAPPING_PACKAGE_ID[network]}::pair::LP<${coinX.coinType}, ${coinY.coinType}>`;
  }

  public get reserveX(): CoinAmount<Coin> {
    return CoinAmount.fromRawAmount(this.coins[0], this.reserves[0]);
  }

  public get reserveY(): CoinAmount<Coin> {
    return CoinAmount.fromRawAmount(this.coins[1], this.reserves[1]);
  }

  public get coinX(): Coin {
    return this.coins[0];
  }

  public get coinY(): Coin {
    return this.coins[1];
  }
}

import invariant from 'tiny-invariant';

import { Coin } from './Coin';
import BN from 'bn.js';
import { BigintIsh, MaxUint256, Rounding } from '../constants';
import { Fraction } from './Fraction';
import BigNumber from 'bignumber.js';

export class CoinAmount<T extends Coin> extends Fraction {
  public readonly coin: T;
  public readonly decimalScale: BN;

  /**
   * Returns a new currency amount instance from the unitless amount of token, i.e. the raw amount
   * @param coin the currency in the amount
   * @param rawAmount the raw token or ether amount
   */
  public static fromRawAmount<T extends Coin>(
    coin: T,
    rawAmount: BigintIsh
  ): CoinAmount<T> {
    return new CoinAmount(coin, rawAmount);
  }

  /**
   * Construct a currency amount with a denominator that is not equal to 1
   * @param coin the currency
   * @param numerator the numerator of the fractional token amount
   * @param denominator the denominator of the fractional token amount
   */
  public static fromFractionalAmount<T extends Coin>(
    coin: T,
    numerator: BigintIsh,
    denominator: BigintIsh
  ): CoinAmount<T> {
    return new CoinAmount(coin, numerator, denominator);
  }

  public static ONE<T extends Coin>(coin: T): CoinAmount<T> {
    const oneAmount = new BN(10).pow(new BN(coin.decimals));
    return new CoinAmount(coin, oneAmount);
  }

  protected constructor(
    coin: T,
    numerator: BigintIsh,
    denominator?: BigintIsh
  ) {
    super(numerator, denominator);
    invariant(new BN(this.quotient).lte(MaxUint256), 'AMOUNT');
    this.coin = coin;
    this.decimalScale = new BN(10).pow(new BN(coin.decimals));
  }

  public override add(other: CoinAmount<T>): CoinAmount<T> {
    invariant(this.coin.equals(other.coin), 'CURRENCY');
    const added = super.add(other);
    return CoinAmount.fromFractionalAmount(
      this.coin,
      added.numerator,
      added.denominator
    );
  }

  public override subtract(other: CoinAmount<T>): CoinAmount<T> {
    invariant(this.coin.equals(other.coin), 'CURRENCY');
    const subtracted = super.subtract(other);
    return CoinAmount.fromFractionalAmount(
      this.coin,
      subtracted.numerator,
      subtracted.denominator
    );
  }

  public override multiply(other: Fraction | BigintIsh): CoinAmount<T> {
    const multiplied = super.multiply(other);
    return CoinAmount.fromFractionalAmount(
      this.coin,
      multiplied.numerator,
      multiplied.denominator
    );
  }

  public override divide(other: Fraction | BigintIsh): CoinAmount<T> {
    const divided = super.divide(other);
    return CoinAmount.fromFractionalAmount(
      this.coin,
      divided.numerator,
      divided.denominator
    );
  }

  public override toFixed(
    decimalPlaces: number = this.coin.decimals,
    format: object = { groupSeparator: '', decimalSeparator: '.' },
    rounding: Rounding = Rounding.ROUND_DOWN
  ): string {
    invariant(decimalPlaces <= this.coin.decimals, 'DECIMALS');
    return super
      .divide(this.decimalScale)
      .toFixed(decimalPlaces, format, rounding);
  }

  public toExact(
    format: object = { groupSeparator: '', decimalSeparator: '.' }
  ): string {
    const BN = BigNumber.clone();
    BN.set({ DECIMAL_PLACES: this.coin.decimals });
    return new BN(this.quotient.toString())
      .div(this.decimalScale.toString())
      .toFormat(format);
  }
}

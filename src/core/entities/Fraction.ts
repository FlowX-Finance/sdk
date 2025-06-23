import invariant from 'tiny-invariant';
import BigNumber from 'bignumber.js';

import { BigintIsh, Rounding } from '../constants';
import BN from 'bn.js';

const toFixedRounding = {
  [Rounding.ROUND_DOWN]: BigNumber.ROUND_DOWN,
  [Rounding.ROUND_HALF_UP]: BigNumber.ROUND_HALF_UP,
  [Rounding.ROUND_UP]: BigNumber.ROUND_UP,
};

export class Fraction {
  public readonly numerator: BN;
  public readonly denominator: BN;

  public constructor(numerator: BigintIsh, denominator: BigintIsh = new BN(1)) {
    this.numerator = new BN(numerator);
    this.denominator = new BN(denominator);
  }

  private static tryParseFraction(fractionish: BigintIsh | Fraction): Fraction {
    if (
      fractionish instanceof BN ||
      typeof fractionish === 'number' ||
      typeof fractionish === 'string'
    )
      return new Fraction(fractionish);

    if ('numerator' in fractionish && 'denominator' in fractionish)
      return fractionish;
    throw new Error('Could not parse fraction');
  }

  // performs floor division
  public get quotient(): BN {
    return this.numerator.div(this.denominator);
  }

  // remainder after floor division
  public get remainder(): Fraction {
    return new Fraction(
      this.denominator.mod(this.denominator),
      this.denominator
    );
  }

  public invert(): Fraction {
    return new Fraction(this.denominator, this.numerator);
  }

  public add(other: Fraction | BigintIsh): Fraction {
    const otherParsed = Fraction.tryParseFraction(other);
    if (this.denominator.eq(otherParsed.denominator)) {
      return new Fraction(
        this.numerator.add(otherParsed.numerator),
        this.denominator
      );
    }
    return new Fraction(
      this.numerator
        .mul(otherParsed.denominator)
        .add(otherParsed.numerator.mul(this.denominator)),
      this.denominator.mul(otherParsed.denominator)
    );
  }

  public subtract(other: Fraction | BigintIsh): Fraction {
    const otherParsed = Fraction.tryParseFraction(other);
    if (this.denominator.eq(otherParsed.denominator)) {
      return new Fraction(
        this.numerator.sub(otherParsed.numerator),
        this.denominator
      );
    }
    return new Fraction(
      this.numerator
        .mul(otherParsed.denominator)
        .sub(otherParsed.numerator.mul(this.denominator)),
      this.denominator.mul(otherParsed.denominator)
    );
  }

  public multiply(other: Fraction | BigintIsh): Fraction {
    const otherParsed = Fraction.tryParseFraction(other);
    return new Fraction(
      this.numerator.mul(otherParsed.numerator),
      this.denominator.mul(otherParsed.denominator)
    );
  }

  public divide(other: Fraction | BigintIsh): Fraction {
    const otherParsed = Fraction.tryParseFraction(other);
    return new Fraction(
      this.numerator.mul(otherParsed.denominator),
      this.denominator.mul(otherParsed.numerator)
    );
  }

  public lt(other: Fraction | BigintIsh): boolean {
    const otherParsed = Fraction.tryParseFraction(other);
    return this.numerator
      .mul(otherParsed.denominator)
      .lt(otherParsed.numerator.mul(this.denominator));
  }

  public eq(other: Fraction | BigintIsh): boolean {
    const otherParsed = Fraction.tryParseFraction(other);
    return this.numerator
      .mul(otherParsed.denominator)
      .eq(otherParsed.numerator.mul(this.denominator));
  }

  public gt(other: Fraction | BigintIsh): boolean {
    const otherParsed = Fraction.tryParseFraction(other);
    return this.numerator
      .mul(otherParsed.denominator)
      .gt(otherParsed.numerator.mul(this.denominator));
  }

  public toFixed(
    decimalPlaces: number,
    format: object = { groupSeparator: '', decimalSeparator: '.' },
    rounding: Rounding = Rounding.ROUND_HALF_UP
  ): string {
    invariant(
      Number.isInteger(decimalPlaces),
      `${decimalPlaces} is not an integer.`
    );
    invariant(decimalPlaces >= 0, `${decimalPlaces} is negative.`);

    const BN = BigNumber.clone();
    BN.set({
      DECIMAL_PLACES: decimalPlaces,
      ROUNDING_MODE: toFixedRounding[rounding],
    });
    return new BN(this.numerator.toString())
      .div(this.denominator.toString())
      .toFormat(decimalPlaces, format);
  }

  /**
   * Helper method for converting any super class back to a fraction
   */
  public get asFraction(): Fraction {
    return new Fraction(this.numerator, this.denominator);
  }

  public static max(...n: Fraction[]) {
    invariant(n.length > 0, 'LENGTH');
    let temp = n[0];
    n.slice(1).forEach((item) => {
      if (item.gt(temp)) {
        temp = item;
      }
    });

    return temp;
  }

  public static min(...n: Fraction[]) {
    invariant(n.length > 0, 'LENGTH');
    let temp = n[0];
    n.slice(1).forEach((item) => {
      if (item.lt(temp)) {
        temp = item;
      }
    });

    return temp;
  }
}

import BigNumber from 'bignumber.js';
import {
  FLOAT_SCALING,
  ONE_DAY,
  ONE_HOUR,
  ONE_MINUTE,
  ONE_MONTH,
  ONE_WEEK,
} from '../constants';
import { MissingImplementation } from '../errors';
import { SubscriptionCycle } from '../plan';

export const calculateSubscriptionInterval = (
  cycle: SubscriptionCycle,
  quantityBig: bigint
) => {
  const quantity = Number(quantityBig);
  switch (cycle) {
    case SubscriptionCycle.MINUTE:
      return quantity * ONE_MINUTE;
    case SubscriptionCycle.HOUR:
      return quantity * ONE_HOUR;
    case SubscriptionCycle.DAY:
      return quantity * ONE_DAY;
    case SubscriptionCycle.WEEK:
      return quantity * ONE_WEEK;
    case SubscriptionCycle.MONTH:
      return quantity * ONE_MONTH;
    default:
      throw new MissingImplementation(cycle);
  }
};

export const calculateExecutionPrice = (
  investedAmount: string,
  purchasedAmount: string
): string => {
  const BN = BigNumber.clone();
  BN.set({
    ROUNDING_MODE: BigNumber.ROUND_FLOOR,
  });

  return new BN(purchasedAmount)
    .multipliedBy(FLOAT_SCALING)
    .div(investedAmount)
    .toFixed();
};

import { BigintIsh, Coin, Percent } from '../../core';
import { Protocol } from '../constants';
import { Commission, Route } from '../entities';

export interface BaseQuoteQueryParams {
  tokenIn: string;
  tokenOut: string;
  includeSources?: Protocol[];
  excludeSources?: Protocol[];
}

export interface SingleQuoteQueryParams extends BaseQuoteQueryParams {
  amountIn: string;
  excludePools?: string[];
  maxHops?: number;
  splitDistributionPercent?: number;
  commission?: Commission;
}

export interface BatchQuoteQueryParams extends BaseQuoteQueryParams {
  amountIns: string[];
  amountExpectedOuts: string[];
}

export interface GetRoutesResult<CInput extends Coin, COutput extends Coin> {
  coinIn: CInput;
  coinOut: COutput;
  amountIn: BigintIsh;
  amountOut: BigintIsh;
  priceImpact: Percent;
  routes: Route<CInput, COutput>[];
}

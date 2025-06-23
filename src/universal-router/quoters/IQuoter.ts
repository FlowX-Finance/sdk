import { Coin } from '../../core';
import { GetRoutesResult, SingleQuoteQueryParams } from './types';

export interface IQuoter<CInput extends Coin, COutput extends Coin> {
  getRoutes(
    params: SingleQuoteQueryParams
  ): Promise<GetRoutesResult<CInput, COutput>>;
}

import { Coin } from '../../core';
import { BatchQuoteQueryParams, GetRoutesResult } from './types';

export interface IBatchQuoter<CInput extends Coin, COutput extends Coin> {
  batchQuote(
    params: BatchQuoteQueryParams
  ): Promise<GetRoutesResult<CInput, COutput>>;
}

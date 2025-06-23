import { CoinProvider, NETWORK } from '../../core';
import { PriceProvider } from './PriceProvider';
import invariant from 'tiny-invariant';
import { shortedCoinType } from '../../core/utils';

export class FlowXPriceProvider implements PriceProvider {
  #queue: Array<{
    request: string;
    resolve: ((value: number | PromiseLike<number>) => void) | null;
    reject: ((reason?: any) => void) | null;
  }> | null = [];
  #coinProvider: CoinProvider;
  #pendingAggregator: NodeJS.Timer | null;

  constructor(network: NETWORK) {
    // invariant(network === 'mainnet', 'ONLY_MAINNET');
    this.#coinProvider = new CoinProvider(network);
  }

  async getPrice(token: string): Promise<number> {
    if (this.#queue == null) {
      this.#queue = [];
    }

    const inflightRequest: {
      request: string;
      resolve: ((value: number | PromiseLike<number>) => void) | null;
      reject: ((reason?: any) => void) | null;
    } = {
      request: shortedCoinType(token),
      resolve: null,
      reject: null,
    };
    const promise = new Promise<number>((resolve, reject) => {
      inflightRequest.resolve = resolve;
      inflightRequest.reject = reject;
    });
    this.#queue.push(inflightRequest);

    if (!this.#pendingAggregator) {
      // Schedule batch for next event loop + short duration
      this.#pendingAggregator = setTimeout(async () => {
        // Get the current batch and clear it, so new requests
        // go into the next batch
        const requests = this.#queue?.slice() ?? [];
        this.#queue = null;
        this.#pendingAggregator = null;

        const prices = await this.#coinProvider.multiGetPrices(
          requests.map((inflightRequest) => inflightRequest.request)
        );
        requests.forEach((inflightRequest, idx) => {
          inflightRequest.resolve?.(prices[idx]);
        });
      }, 10);
    }

    return promise;
  }
}

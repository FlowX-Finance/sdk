import {
  GetObjectParams,
  MultiGetObjectsParams,
  SuiClient,
  SuiClientOptions,
  SuiObjectResponse,
} from '@mysten/sui/client';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { DEFAULT_CONCURRENCY, MAX_OBJECTS_PER_QUERY } from '../constants';

const limit = pLimit(DEFAULT_CONCURRENCY);
type SuiBatchClientOptions = {
  scheduleTimeMs: number;
};

export class SuiBatchClient extends SuiClient {
  #queue: Array<{
    request: string;
    resolve:
      | ((value: SuiObjectResponse | PromiseLike<SuiObjectResponse>) => void)
      | null;
    reject: ((reason?: any) => void) | null;
  }> | null = [];
  #pendingAggregator: NodeJS.Timer | null;
  scheduleTimeMs: number;

  constructor(options: SuiBatchClientOptions & SuiClientOptions) {
    super(options);
    this.scheduleTimeMs = options.scheduleTimeMs;
  }

  override async getObject(input: GetObjectParams): Promise<SuiObjectResponse> {
    if (this.#queue == null) {
      this.#queue = [];
    }

    const inflightRequest: {
      request: string;
      resolve:
        | ((value: SuiObjectResponse | PromiseLike<SuiObjectResponse>) => void)
        | null;
      reject: ((reason?: any) => void) | null;
    } = {
      request: normalizeSuiObjectId(input.id),
      resolve: null,
      reject: null,
    };
    const promise = new Promise<SuiObjectResponse>((resolve, reject) => {
      inflightRequest.resolve = resolve;
      inflightRequest.reject = reject;
    });
    this.#queue.push(inflightRequest);

    if (!this.#pendingAggregator) {
      // Schedule batch for next event loop + short duration
      this.#pendingAggregator = setTimeout(async () => {
        // Get the current batch and clear it, so new requests
        // go into the next batch
        const batches = chunk(this.#queue?.slice(), MAX_OBJECTS_PER_QUERY);
        this.#queue = null;
        this.#pendingAggregator = null;

        await Promise.all(
          batches.map((batch) =>
            limit(async () => {
              const mappingRequestToResult: Record<string, number> = {};
              const uniqueRequests = new Set<string>();

              batch.forEach((inflight) => {
                if (!uniqueRequests.has(inflight.request)) {
                  uniqueRequests.add(inflight.request);
                  mappingRequestToResult[inflight.request] =
                    uniqueRequests.size - 1;
                }
              });

              const results: SuiObjectResponse[] = await this.call(
                'sui_multiGetObjects',
                [
                  [...uniqueRequests],
                  {
                    showContent: true,
                    showDisplay: true,
                    showOwner: true,
                    showType: true,
                  },
                ]
              );

              // For each result, feed it to the correct Promise, depending
              // on whether it was a success or error
              batch.forEach((inflight) => {
                inflight.resolve?.(
                  results[mappingRequestToResult[inflight.request]]
                );
              });
            })
          )
        );
      }, this.scheduleTimeMs);
    }

    return promise;
  }
}

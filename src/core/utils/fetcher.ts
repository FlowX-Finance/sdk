import {
  DynamicFieldInfo,
  PaginatedEvents,
  SuiClient,
  SuiEvent,
  SuiEventFilter,
  SuiObjectData,
  SuiObjectDataOptions,
} from '@mysten/sui/client';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import invariant from 'tiny-invariant';

import { DEFAULT_CONCURRENCY, MAX_OBJECTS_PER_QUERY } from '../constants';
import { sdkCache } from '../cache';
import { Coin } from '../entities';

export const getAllOwnedObjects = async (
  { owner, objectType }: { owner: string; objectType: string },
  client: SuiClient
) => {
  let cursor,
    hasNextPage = false;
  const results: SuiObjectData[] = [];

  do {
    const reps = await client.getOwnedObjects({
      owner,
      filter: {
        StructType: objectType,
      },
      cursor,
      options: {
        showContent: true,
        showType: true,
      },
    });

    cursor = reps.nextCursor;
    hasNextPage = reps.hasNextPage;
    results.push(...reps.data.map((it) => it.data!));
  } while (hasNextPage);

  return results;
};

export const getAllDynamicFields = async (
  parentId: string,
  client: SuiClient
) => {
  let cursor,
    hasNextPage = false;
  const results: DynamicFieldInfo[] = [];

  do {
    const reps = await client.getDynamicFields({
      parentId,
      cursor,
    });

    cursor = reps.nextCursor;
    hasNextPage = reps.hasNextPage;
    results.push(...reps.data);
  } while (hasNextPage);

  return results;
};

const limit = pLimit(DEFAULT_CONCURRENCY);
export const multiGetObjects = async (
  client: SuiClient,
  objectIds: string[],
  options?: SuiObjectDataOptions
) => {
  const batches = chunk(objectIds, MAX_OBJECTS_PER_QUERY);

  const results = await Promise.all(
    batches.map((batch) =>
      limit(() =>
        client.multiGetObjects({
          ids: batch,
          options: options ?? {
            showOwner: true,
            showType: true,
            showContent: true,
          },
        })
      )
    )
  );

  return results
    .flat()
    .filter((item) => !!item.data)
    .map((item) => item.data!);
};

export const queryAllEvents = async (
  query: SuiEventFilter,
  client: SuiClient
) => {
  let result: SuiEvent[] = [];
  let hasNextPage = true;
  let nextCursor;

  do {
    const res: PaginatedEvents = await client.queryEvents({
      query,
      cursor: nextCursor,
    });
    if (res.data) {
      result = [...result, ...res.data];
      hasNextPage = res.hasNextPage;
      nextCursor = res.nextCursor;
    } else {
      hasNextPage = false;
    }
  } while (hasNextPage);

  return result;
};

export const fetchCoin =
  (coinType: string) =>
  async (client: SuiClient): Promise<Coin> => {
    const cached = sdkCache.get<Coin>(coinType);
    if (cached) {
      return cached;
    }

    const metadata = await client.getCoinMetadata({
      coinType: coinType,
    });
    invariant(metadata, 'coin not found');

    const token = new Coin(
      coinType,
      metadata.decimals,
      metadata.symbol,
      metadata.name
    );
    sdkCache.set(coinType, token, 0);

    return token;
  };

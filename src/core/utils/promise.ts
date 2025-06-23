import pLimit from 'p-limit';

interface PromiseResolvedResult<T> {
  status: 'resolved';
  data: T;
}

interface PromiseRejectedResult {
  status: 'rejected';
  error: any;
}

type PromiseResult<T> = PromiseResolvedResult<T> | PromiseRejectedResult;

export function reflect<T>(promise: Promise<T>): Promise<PromiseResult<T>> {
  return promise
    .then((data: T) => {
      return { data, status: 'resolved' } as PromiseResolvedResult<T>;
    })
    .catch((error: any) => {
      return { error, status: 'rejected' } as PromiseRejectedResult;
    });
}

export async function PromiseAll<T>(
  values: Promise<T>[],
  concurrency = 10
): Promise<T[]> {
  const limit = pLimit(concurrency);
  const results: any[] = [];
  await (async () => {
    return await Promise.all(
      values.map((value) => limit(() => reflect(value)))
    );
  })().then(async (res) => {
    const errors: any[] = [];
    res.forEach((r) => {
      if (r.status === 'rejected') {
        errors.push(r.error);
      } else {
        results.push(r.data);
      }
    });

    if (errors.length > 0) {
      // have lots of error, throw first error
      throw errors[0];
    }
  });

  return results;
}

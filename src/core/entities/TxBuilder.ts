import {
  DynamicFieldInfo,
  PaginatedObjectsResponse,
  SuiClient,
  SuiObjectDataFilter,
  SuiObjectDataOptions,
  SuiObjectResponse,
  getFullnodeUrl,
} from '@mysten/sui/client';
import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from '@mysten/sui/transactions';
import {
  BigintIsh,
  MODULE_OPTION,
  NETWORK,
  STD_PACKAGE_ID,
} from '../constants';
import _, { isNil } from 'lodash';

export class TxBuilder {
  static _client: SuiClient;
  // public _client: SuiClient;
  public _tx: Transaction;
  public _coinIn: TransactionArgument;
  public _sender: string;

  constructor(public network: NETWORK) {
    this._tx = new Transaction();
  }

  static createInstance<T>(network: NETWORK): T {
    const ins = new this(network);

    return ins as T;
  }

  static setClient(client: SuiClient) {
    TxBuilder._client = client;
  }

  get _client() {
    return (
      TxBuilder._client ?? new SuiClient({ url: getFullnodeUrl(this.network) })
    );
  }

  clone() {
    return _.cloneDeep(this);
  }

  suiClient(client: SuiClient) {
    TxBuilder._client = client;

    return this;
  }

  tx(tx: Transaction) {
    this._tx = tx;

    return this;
  }

  getTx() {
    return this._tx;
  }

  coinIn(coinIn: TransactionArgument) {
    this._coinIn = coinIn;

    return this;
  }

  sender(sender: string) {
    this._sender = sender;

    return this;
  }

  protected createU64Option(
    value?: string | TransactionResult
  ): TransactionResult {
    const tx = this._tx;
    return tx.moveCall({
      package: STD_PACKAGE_ID,
      module: MODULE_OPTION,
      function: !isNil(value) ? 'some' : 'none',
      typeArguments: ['u64'],
      arguments: !isNil(value)
        ? [typeof value === 'string' ? tx.pure.u64(value) : value]
        : [],
    });
  }

  protected createAddressOption(
    value?: string | TransactionResult
  ): TransactionResult {
    const tx = this._tx;
    return tx.moveCall({
      package: STD_PACKAGE_ID,
      module: MODULE_OPTION,
      function: !isNil(value) ? 'some' : 'none',
      typeArguments: ['address'],
      arguments: !isNil(value)
        ? [typeof value === 'string' ? tx.pure.address(value) : value]
        : [],
    });
  }

  protected createBooleanOption(
    value?: boolean | TransactionResult
  ): TransactionResult {
    const tx = this._tx;
    return tx.moveCall({
      package: STD_PACKAGE_ID,
      module: MODULE_OPTION,
      function: !isNil(value) ? 'some' : 'none',
      typeArguments: ['bool'],
      arguments: !isNil(value)
        ? [typeof value === 'boolean' ? tx.pure.bool(value) : value]
        : [],
    });
  }

  async getFullyOwnedObjects(
    account: string,
    options?: SuiObjectDataOptions,
    filter?: SuiObjectDataFilter
  ) {
    let hasNextPage = false;
    const data: SuiObjectResponse[] = [];
    let cursor;
    do {
      const results: PaginatedObjectsResponse =
        await this._client.getOwnedObjects({
          owner: account,
          options,
          cursor,
          filter,
        });

      cursor = results.nextCursor;
      hasNextPage = results.hasNextPage;

      data.push(...results.data);
    } while (hasNextPage);

    return data;
  }

  async getMultipleIds(lpObjectIds: string[]): Promise<SuiObjectResponse[]> {
    const splitObjectIds: string[][] = [];
    for (let i = 0; i < lpObjectIds.length; i += 50) {
      splitObjectIds.push(lpObjectIds.slice(i, i + 50));
    }

    const splitContentInfos = await Promise.all(
      splitObjectIds.map((items) =>
        this._client.multiGetObjects({
          ids: items,
          options: { showContent: true },
        })
      )
    );

    return splitContentInfos.flat();
  }

  async getFullyDynamicFields(parentId: string) {
    let cursor,
      hasNextPage = false;

    const data: DynamicFieldInfo[] = [];
    do {
      const result = await this._client.getDynamicFields({
        parentId,
        cursor,
      });

      cursor = result.nextCursor;
      hasNextPage = result.hasNextPage;
      data.push(...result.data);
    } while (hasNextPage);

    return data;
  }
}

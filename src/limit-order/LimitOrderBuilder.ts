import invariant from 'tiny-invariant';
import { Coin, NETWORK } from '../core';
import { TxBuilder } from '../core/entities/TxBuilder';
import {
  CancelOrderArgs,
  FillOrderArgs,
  OrderArgs,
  PlaceOrderArgs,
  QueryOrderArgs,
  TakeOrderArgs,
} from './types/types';
import BN from 'bn.js';
import { CONFIGS } from './constants';
import { BPS } from '../universal-router';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui.js/utils';
import BigNumber from 'bignumber.js';

export class LimitOrderBuilder<
  CMaker extends Coin,
  CTaker extends Coin
> extends TxBuilder {
  private _coinMaker: CMaker;
  private _coinTaker: CTaker;

  constructor(network: NETWORK) {
    super(network);
  }

  coinMaker(coin: CMaker) {
    this._coinMaker = coin;

    return this;
  }

  coinTaker(coin: CTaker) {
    this._coinTaker = coin;

    return this;
  }

  async placeOrder(args: PlaceOrderArgs) {
    if (
      args.allowedPartialFills === undefined ||
      args.allowedPartialFills === null
    ) {
      args.allowedPartialFills = true;
    }

    invariant(this._coinMaker, 'COIN_MAKER_NOT_FOUND');
    invariant(this._coinTaker, 'COIN_TAKER_NOT_FOUND');

    invariant(
      !new BigNumber(args.amountOutExpected.toString()).eq(0),
      'INVALID_EXPECTED_AMOUNT'
    );
    invariant(
      args.expiredTimestamp == 0 ||
        (args.expiredTimestamp != 0 && args.expiredTimestamp > Date.now()),
      'INVALID_EXPIRED_TIMESTAMP'
    );

    invariant(
      !this._coinIn && !new BigNumber((args.amountIn ?? '0').toString()).eq(0),
      'INVALID_INPUT_AMOUNT'
    );
    invariant(!this._coinIn && this._sender, 'SENDER_NOT_FOUND');

    const tx = this._tx;

    //take coin in from wallet if not input
    if (!this._coinIn && args.amountIn) {
      this._coinIn = await this._coinMaker.take({
        amount: args.amountIn,
        owner: this._sender,
        client: this._client,
        tx: tx,
      });
    }

    const addressOpts = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: ['address'],
      arguments: [],
    });
    const addressOpts2 = tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: ['address'],
      arguments: [],
    });

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::orderbook::place_order`,
      typeArguments: [this._coinMaker.coinType, this._coinTaker.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        tx.pure.u64(Math.floor(Math.random() * BPS.toNumber())),
        addressOpts,
        addressOpts2,
        tx.pure.u64(args.amountOutExpected.toString()),
        tx.pure.u64(args.expiredTimestamp),
        tx.pure.bool(args.allowedPartialFills),
        this._coinIn,
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  async cancelOrder(args: CancelOrderArgs) {
    invariant(this._coinMaker, 'COIN_MAKER_NOT_FOUND');

    invariant(args.orderId, 'INVALID_ORDER_ID');

    const tx = this._tx;

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::orderbook::cancel_order`,
      typeArguments: [this._coinMaker.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        tx.pure.u64(args.orderId.toString()),
      ],
    });
  }

  async takeOrder(args: TakeOrderArgs) {
    invariant(this._coinMaker, 'COIN_MAKER_NOT_FOUND');
    invariant(this._coinTaker, 'COIN_TAKER_NOT_FOUND');
    invariant(args.orderId, 'INVALID_ORDER_ID');

    const tx = this._tx;

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::orderbook::take_order`,
      typeArguments: [this._coinMaker.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        tx.pure.u64(args.orderId.toString()),
        tx.pure.u64(args.amount.toString()),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  async fillOrder(args: FillOrderArgs) {
    invariant(this._coinTaker, 'COIN_TAKER_NOT_FOUND');

    const tx = this._tx;

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::orderbook::fill_order`,
      typeArguments: [this._coinTaker.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        args.receipt,
        args.filled,
      ],
    });
  }

  async getOrders(args: QueryOrderArgs) {
    const tx = this._tx;

    const limit = tx.moveCall({
      target: `0x1::option::some`,
      typeArguments: ['u64'],
      arguments: [tx.pure.u64(args.limit)],
    });

    let cursor;
    if (args.cursor) {
      cursor = tx.moveCall({
        target: `0x1::option::some`,
        typeArguments: ['u64'],
        arguments: [tx.pure.u64(args.cursor)],
      });
    } else {
      cursor = tx.moveCall({
        target: `0x1::option::none`,
        typeArguments: ['u64'],
        arguments: [],
      });
    }

    const desc = tx.moveCall({
      target: `0x1::option::some`,
      typeArguments: ['bool'],
      arguments: [tx.pure.bool(args.desc ?? false)],
    });

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::order_query::query_orders`,
      typeArguments: [],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        tx.pure.address(args.owner),
        cursor,
        limit,
        desc,
      ],
    });
  }

  async getOrder(args: OrderArgs) {
    const tx = this._tx;

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::orderbook::get_order`,
      typeArguments: [],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        tx.pure.u64(args.orderId.toString()),
      ],
    });
  }

  async orderExists(args: OrderArgs) {
    const tx = this._tx;

    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId}::orderbook::order_exists`,
      typeArguments: [],
      arguments: [
        tx.object(CONFIGS[this.network].orderbookObject),
        tx.pure.u64(args.orderId.toString()),
      ],
    });
  }
}

import { BN } from 'bn.js';
import { isValidSuiAddress } from '@mysten/sui/utils';

import { BigintIsh, Coin, NETWORK, ZERO, sumBn } from '../../core';
import { Commission } from '../entities/Commission';
import { Route } from '../entities/Route';
import invariant from 'tiny-invariant';
import { Trade } from '../entities/Trade';
import { BPS } from '../constants';

export class TradeBuilder<CInput extends Coin, COutput extends Coin> {
  private _network!: NETWORK;
  private _sender: string | undefined;
  private _recipient: string | undefined;
  private _amountIn!: BigintIsh;
  private _amountOut!: BigintIsh;
  private _slippage!: number;
  private _deadline!: number;
  private _routes!: Route<CInput, COutput>[];
  private _commission: Commission | undefined;

  public static fromRoutes<CInput extends Coin, COutput extends Coin>(
    routes: Route<CInput, COutput>[]
  ): TradeBuilder<CInput, COutput> {
    return new TradeBuilder(routes[0]?.network, routes);
  }

  constructor(network: NETWORK, routes: Route<CInput, COutput>[]) {
    invariant(
      routes.length > 0 &&
        routes
          .slice(1)
          .every(
            (route) =>
              route.input.equals(routes[0].input) &&
              route.output.equals(routes[0].output)
          ),
      'ROUTES'
    );

    this._network = network;
    this._routes = routes;
    this._amountIn = sumBn(routes.map((route) => new BN(route.amountIn)));
    this._amountOut = sumBn(routes.map((route) => new BN(route.amountOut)));
    this._slippage = 0;
    this._deadline = Number.MAX_SAFE_INTEGER;
  }

  public sender(sender: string): TradeBuilder<CInput, COutput> {
    this._sender = sender;
    return this;
  }

  public recipient(recipient: string): TradeBuilder<CInput, COutput> {
    this._recipient = recipient;
    return this;
  }

  /**
   * @deprecated remove in feature
   * We don't need pass amount in anymore, it always auto calculate
   * */
  public amountIn(amountIn: BigintIsh): TradeBuilder<CInput, COutput> {
    this._amountIn = amountIn;
    return this;
  }

  /**
   * @deprecated remove in feature
   * We don't need pass amount out anymore, it always auto calculate
   * */
  public amountOut(amountOut: BigintIsh): TradeBuilder<CInput, COutput> {
    this._amountOut = amountOut;
    return this;
  }

  public deadline(deadline: number): TradeBuilder<CInput, COutput> {
    this._deadline = deadline;
    return this;
  }

  public slippage(slippage: number): TradeBuilder<CInput, COutput> {
    this._slippage = slippage;
    return this;
  }

  public commission(commission: Commission): TradeBuilder<CInput, COutput> {
    this._commission = commission;
    return this;
  }

  public build(): Trade<CInput, COutput> {
    invariant(
      !this._commission ||
        this._routes[0].input.equals(this._commission.coin) ||
        this._routes[0].output.equals(this._commission.coin),
      'INVALID_COMMISSION'
    );

    invariant(new BN(this._amountIn).gt(ZERO), 'AMOUNT_IN');
    invariant(new BN(this._amountOut).gt(ZERO), 'AMOUNT_OUT');
    invariant(new BN(this._slippage).lte(BPS), 'SLIPPAGE');
    invariant(
      (!this._sender || isValidSuiAddress(this._sender)) &&
        (!this._recipient || isValidSuiAddress(this._recipient)),
      'ADDRESSEES'
    );

    const amountIn = new BN(this._amountIn).add(
      this._commission?.coin.equals(this._routes[0].input)
        ? this._commission.computeCommissionAmount(this._amountIn, {
            coinIn: this._routes[0].input,
            coinOut: this._routes[0].output,
          })
        : ZERO
    );

    return new Trade({
      network: this._network,
      sender: this._sender,
      amountIn: amountIn,
      amountOut: this._amountOut,
      slippage: this._slippage,
      deadline: this._deadline,
      routes: this._routes,
      commission: this._commission,
    });
  }
}

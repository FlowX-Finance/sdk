import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, NETWORK, ObjectId, Percent, ZERO } from '../../core';
import { Protocol } from '../constants';
import invariant from 'tiny-invariant';
import { OracleInfo } from '../types';

export interface WrappedRouterConfig {
  wrappedRouterPackageId: string;
}

export interface SwapConstructorOptions<
  CInput extends Coin,
  COutput extends Coin,
  ProtocolConfig extends WrappedRouterConfig
> {
  network: NETWORK;
  pool: ObjectId;
  input: CInput;
  output: COutput;
  amountIn: BigintIsh;
  amountOut: BigintIsh;
  protocolConfig: ProtocolConfig;
  oracles?: OracleInfo[];
}

export abstract class Swap<
  CInput extends Coin,
  COutput extends Coin,
  ProtocolConfig extends WrappedRouterConfig,
  Options extends SwapConstructorOptions<CInput, COutput, ProtocolConfig>
> {
  public readonly network!: NETWORK;
  public readonly pool!: ObjectId;
  public readonly input!: CInput;
  public readonly output!: COutput;
  public readonly amountIn!: BigintIsh;
  public readonly amountOut!: BigintIsh;
  public readonly protocolConfig!: ProtocolConfig;
  public readonly oracles?: OracleInfo[];

  constructor(options: Options) {
    invariant(!options.input.equals(options.output), 'COINS');

    this.network = options.network;
    this.pool = options.pool;
    this.input = options.input;
    this.output = options.output;
    this.amountIn = options.amountIn;
    this.amountOut = options.amountOut;
    this.oracles = options.oracles;
    this.protocolConfig = options.protocolConfig;
  }

  public abstract swap(
    routeObject: TransactionResult,
    slippage: Percent,
    pythMap?: Record<string, string> | undefined
  ): (tx: Transaction) => void;

  public abstract protocol(): Protocol;
}

import {
  BigintIsh,
  Coin,
  MODULE_OPTION,
  NETWORK,
  Percent,
  STD_PACKAGE_ID,
} from '../../core';
import { Route } from './Route';
import { Commission } from './Commission';
import {
  coinWithBalance,
  Transaction,
  TransactionArgument,
  TransactionResult,
} from '@mysten/sui/transactions';
import {
  BPS,
  CommissionType,
  CONFIGS,
  MODULE_COMMISSION,
  MODULE_COMMISSION_TYPE,
  MODULE_UNIVERSAL_ROUTER,
} from '../constants';
import {
  normalizeStructTag,
  SUI_CLOCK_OBJECT_ID,
  SUI_TYPE_ARG,
} from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
import invariant from 'tiny-invariant';
import { PythHelper } from './helpers';

export interface TradeOptions<CInput extends Coin, COutput extends Coin>
  extends Partial<BuildTransactionOptions> {
  network: NETWORK;
  sender?: string;
  recipient?: string;
  amountIn: BigintIsh;
  amountOut: BigintIsh;
  slippage: number;
  deadline: number;
  routes: Route<CInput, COutput>[];
  commission?: Commission;
}

export interface BuildTransactionOptions {
  client: SuiClient;
  isDevInspect?: boolean;
}

export interface SwapOptions extends BuildTransactionOptions {
  coinIn?: TransactionArgument;
  tx: Transaction;
}

export class Trade<CInput extends Coin, COutput extends Coin> {
  public readonly network!: NETWORK;
  public readonly sender: string | undefined;
  public readonly recipient: string | undefined;
  public readonly input!: CInput;
  public readonly output!: COutput;
  public readonly amountIn!: BigintIsh;
  public readonly amountOut!: BigintIsh;
  public readonly slippage!: number;
  public readonly deadline!: number;
  public readonly routes!: Route<CInput, COutput>[];
  public readonly commission: Commission | undefined;

  constructor(options: TradeOptions<CInput, COutput>) {
    this.network = options.network;
    this.sender = options.sender;
    this.recipient = options.recipient;
    this.input = options.routes[0].input;
    this.output = options.routes[0].output;
    this.amountIn = options.amountIn;
    this.amountOut = options.amountOut;
    this.slippage = options.slippage;
    this.deadline = options.deadline;
    this.routes = options.routes;
    this.commission = options.commission;
  }

  private _swap =
    (coinIn: TransactionArgument, pythMap: Record<string, string>) =>
    (tx: Transaction) => {
      //Initialize commission object if necessary
      let commissionOpt;
      if (
        !!this.commission &&
        (this.commission.coin.equals(this.input) ||
          this.commission.coin.equals(this.output))
      ) {
        const commissionType =
          this.commission.type === CommissionType.PERCENTAGE
            ? tx.moveCall({
                target: `${
                  CONFIGS[this.network].packageId
                }::${MODULE_COMMISSION_TYPE}::percentage`,
              })
            : tx.moveCall({
                target: `${
                  CONFIGS[this.network].packageId
                }::${MODULE_COMMISSION_TYPE}::flat`,
              });

        const commissionObject = tx.moveCall({
          target: `${
            CONFIGS[this.network].packageId
          }::${MODULE_COMMISSION}::new`,
          arguments: [
            tx.pure.address(this.commission.partner),
            commissionType,
            tx.pure.u64(this.commission.value.toString()),
            tx.pure.bool(this.commission.coin.equals(this.input)),
            tx.pure.bool(this.commission.directTransfer),
          ],
        });
        commissionOpt = tx.moveCall({
          target: `${STD_PACKAGE_ID}::${MODULE_OPTION}::some`,
          typeArguments: [
            `${
              CONFIGS[this.network].packageId
            }::${MODULE_COMMISSION}::Commission`,
          ],
          arguments: [commissionObject],
        });
      } else {
        commissionOpt = tx.moveCall({
          target: `${STD_PACKAGE_ID}::${MODULE_OPTION}::none`,
          typeArguments: [
            `${
              CONFIGS[this.network].packageId
            }::${MODULE_COMMISSION}::Commission`,
          ],
        });
      }

      // Perform build trade object
      const tradeObject = tx.moveCall({
        target: `${
          CONFIGS[this.network].packageId
        }::${MODULE_UNIVERSAL_ROUTER}::build`,
        typeArguments: [this.input.coinType, this.output.coinType],
        arguments: [
          tx.object(CONFIGS[this.network].treasuryObjectId),
          tx.object(CONFIGS[this.network].tradeIdTrackerObjectId),
          tx.object(CONFIGS[this.network].partnerRegistryObjectId),
          coinIn,
          tx.pure.u64(this.amountOut.toString()),
          tx.pure.u64(this.slippage),
          tx.pure.u64(this.deadline),
          tx.pure(
            bcs
              .vector(bcs.U64)
              .serialize(this.routes.map((route) => route.amountIn.toString()))
          ),
          commissionOpt,
          tx.object(CONFIGS[this.network].versionedObjectId),
        ],
      });

      //Perform swap for each route
      for (const route of this.routes) {
        route.swap(tradeObject, new Percent(this.slippage, BPS), pythMap)(tx);
      }

      //Perform settle move call and transfer coin out to sender
      const coinOut = tx.moveCall({
        target: `${
          CONFIGS[this.network].packageId
        }::${MODULE_UNIVERSAL_ROUTER}::settle`,
        typeArguments: [this.input.coinType, this.output.coinType],
        arguments: [
          tx.object(CONFIGS[this.network].treasuryObjectId),
          tx.object(CONFIGS[this.network].partnerRegistryObjectId),
          tradeObject,
          tx.object(CONFIGS[this.network].versionedObjectId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return coinOut;
    };

  public async buildTransaction(
    params: BuildTransactionOptions
  ): Promise<Transaction> {
    invariant(this.sender, 'SENDER');

    const tx = new Transaction();
    // Take coin in from sender
    const coinIn = await this.input.take({
      owner: this.sender,
      amount: this.amountIn,
      tx,
      client: params.client,
      isDevInspect: params.isDevInspect,
    });

    const pythHelper = PythHelper.getInstance({
      client: params.client,
      pythConfig: {
        priceServiceEndpoint: CONFIGS[this.network].pyth.priceServiceEndpoint,
        pythStateObjectId: CONFIGS[this.network].pyth.stateObjectId,
        wormholeStateObjectId: CONFIGS[this.network].wormhole.stateObjectId,
      },
    });
    const pythMap = await pythHelper.updatePythPriceFeedsIfNecessary(
      this.routes,
      tx
    );

    const coinOut = this._swap(coinIn, pythMap)(tx);
    tx.transferObjects([coinOut], this.recipient ?? this.sender);

    return tx;
  }

  public async swap(params: SwapOptions): Promise<TransactionResult | void> {
    const { tx } = params;
    let coinIn = params.coinIn;
    if (!coinIn) {
      invariant(this.sender, 'SENDER');

      coinIn = coinWithBalance({
        balance: BigInt(this.amountIn.toString()),
        type: this.input.coinType,
        useGasCoin: this.input.coinType === normalizeStructTag(SUI_TYPE_ARG),
      })(tx);
    }

    const pythHelper = PythHelper.getInstance({
      client: params.client,
      pythConfig: {
        priceServiceEndpoint: CONFIGS[this.network].pyth.priceServiceEndpoint,
        pythStateObjectId: CONFIGS[this.network].pyth.stateObjectId,
        wormholeStateObjectId: CONFIGS[this.network].wormhole.stateObjectId,
      },
    });
    const pythMap = await pythHelper.updatePythPriceFeedsIfNecessary(
      this.routes,
      tx
    );

    const coinOut = this._swap(coinIn, pythMap)(tx);
    if (this.recipient) {
      tx.transferObjects([coinOut], this.recipient);
    } else {
      return coinOut;
    }
  }
}

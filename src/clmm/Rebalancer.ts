import BN from 'bn.js';
import invariant from 'tiny-invariant';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import {
  BigintIsh,
  Coin,
  CoinAmount,
  MaxUint64,
  NETWORK,
  Percent,
} from '../core';
import { ClmmPosition, FlowXPriceProvider, PriceProvider } from './entities';
import { ZapCalculator } from './utils/ZapCalculator';

import {
  AggregatorQuoter,
  BPS,
  GetRoutesResult,
  Protocol,
  TradeBuilder,
} from '../universal-router';
import { ClmmPositionManager } from './ClmmPositionManager';
import { ClmmPoolManager } from './ClmmPoolManager';

interface RebalancerConstructorArgs {
  network: NETWORK;
}

interface RebalanceOptions {
  slippageTolerance?: number;
  priceImpactPercentThreshold?: number;
  minZapAmounts?: { amountX: BigintIsh; amountY: BigintIsh };
  includeSources?: Protocol[];
  excludeSources?: Protocol[];
  priceProvider?: PriceProvider;
  client?: SuiClient;
}

export class Rebalancer {
  private quoter: AggregatorQuoter;
  private positionManager: ClmmPositionManager;

  public readonly network: NETWORK;

  constructor(options: RebalancerConstructorArgs) {
    this.network = options.network;
    this.quoter = new AggregatorQuoter(options.network);
    this.positionManager = new ClmmPositionManager(
      options.network,
      new ClmmPoolManager(options.network)
    );
  }

  private checkPriceImpact(
    quote: GetRoutesResult<Coin, Coin>,
    priceImpactPercentThreshold?: Percent
  ) {
    invariant(
      !priceImpactPercentThreshold ||
        quote.priceImpact.gt(priceImpactPercentThreshold),
      'exceeded price impact threshold'
    );
  }

  private decreaseLiquidityAndCollect =
    (
      position: ClmmPosition,
      { slippageTolerance }: { slippageTolerance: Percent }
    ) =>
    (tx: Transaction) => {
      this.positionManager.tx(tx);
      this.positionManager.decreaseLiquidity(position, {
        slippageTolerance: slippageTolerance,
        deadline: Number.MAX_SAFE_INTEGER,
      });

      const collectResult = this.positionManager.collect(position, {
        expectedCoinOwedX: CoinAmount.fromRawAmount(
          position.amountX.coin,
          MaxUint64
        ),
        expectedCoinOwedY: CoinAmount.fromRawAmount(
          position.amountY.coin,
          MaxUint64
        ),
      }) as TransactionResult;

      position.pool.poolRewards?.map((poolReward) => {
        this.positionManager.collectPoolReward(position, {
          expectedRewardOwed: CoinAmount.fromRawAmount(
            poolReward.coin,
            MaxUint64
          ),
          recipient: position.owner,
        });
      });

      this.positionManager.closePosition(position);
      return collectResult;
    };

  rebalance =
    (
      position: ClmmPosition,
      tickLower: number,
      tickUpper: number,
      options?: RebalanceOptions
    ) =>
    async (tx: Transaction) => {
      const client =
        options?.client ||
        new SuiClient({
          url: getFullnodeUrl(this.network),
        });
      const priceProvider =
        options?.priceProvider || new FlowXPriceProvider(this.network);
      const minZapAmounts = options?.minZapAmounts || {
        amountX: CoinAmount.ONE(position.pool.coinX).quotient,
        amountY: CoinAmount.ONE(position.pool.coinY).quotient,
      };
      const slippageTolerance = new Percent(
        options?.slippageTolerance ?? BPS,
        BPS
      );

      const feeAmounts = await position.getFees();
      const burnAmounts = {
        amountX: position.mintAmounts.amountX.add(feeAmounts.amountX),
        amountY: position.mintAmounts.amountY.add(feeAmounts.amountY),
      };

      let positionThatWillBeCreated = ClmmPosition.fromAmounts({
        owner: position.owner,
        pool: position.pool,
        tickLower,
        tickUpper,
        amountX: burnAmounts.amountX,
        amountY: burnAmounts.amountY,
        useFullPrecision: false,
      });

      const expectedMintAmounts = {
        amountX: burnAmounts.amountX.clone(),
        amountY: burnAmounts.amountY.clone(),
      };

      const remainingX = burnAmounts.amountX.sub(
        positionThatWillBeCreated.mintAmounts.amountX
      );
      const remainingY = burnAmounts.amountY.sub(
        positionThatWillBeCreated.mintAmounts.amountY
      );

      const [coinXType, coinYType] = [
        position.pool.coins[0].coinType,
        position.pool.coins[1].coinType,
      ];

      const [collectedX, collectedY] = this.decreaseLiquidityAndCollect(
        position,
        {
          slippageTolerance,
        }
      )(tx);

      //Only one of the two assets, X or Y, is redundant when liquidity is added.
      if (remainingX.gt(new BN(minZapAmounts.amountX))) {
        const zapAmount = await ZapCalculator.zapAmount({
          pool: position.pool,
          tickLower,
          tickUpper,
          amount: remainingX,
          isCoinX: true,
          priceProvider,
        });

        const quote = await this.quoter.getRoutes({
          tokenIn: coinXType,
          tokenOut: coinYType,
          amountIn: zapAmount.toString(),
          includeSources: options?.includeSources,
          excludeSources: options?.excludeSources || [],
          excludePools: [position.pool.id],
        });
        this.checkPriceImpact(quote);

        expectedMintAmounts.amountX =
          expectedMintAmounts.amountX.sub(zapAmount);
        expectedMintAmounts.amountY = expectedMintAmounts.amountY.add(
          new BN(quote.amountOut)
        );

        const [zapCoin] = tx.splitCoins(collectedX, [zapAmount.toString()]);
        const trade = new TradeBuilder(this.network, quote.routes)
          .slippage(slippageTolerance.numerator.toNumber())
          .build();
        const coinYOut = (await trade.swap({
          tx,
          coinIn: zapCoin,
          client: client,
        })) as TransactionResult;
        tx.mergeCoins(collectedY, [coinYOut]);
      } else if (remainingY.gt(new BN(minZapAmounts.amountY))) {
        const zapAmount = await ZapCalculator.zapAmount({
          pool: position.pool,
          tickLower,
          tickUpper,
          amount: remainingY,
          isCoinX: false,
          priceProvider,
        });

        const quote = await this.quoter.getRoutes({
          tokenIn: coinYType,
          tokenOut: coinXType,
          amountIn: zapAmount.toString(),
          includeSources: options?.includeSources,
          excludeSources: options?.excludeSources || [],
          excludePools: [position.pool.id],
        });
        this.checkPriceImpact(quote);

        expectedMintAmounts.amountY =
          expectedMintAmounts.amountY.sub(zapAmount);
        expectedMintAmounts.amountX = expectedMintAmounts.amountX.add(
          new BN(quote.amountOut)
        );

        const [zapCoin] = tx.splitCoins(collectedY, [zapAmount.toString()]);
        const trade = new TradeBuilder(this.network, quote.routes)
          .slippage(slippageTolerance.numerator.toNumber())
          .build();
        const coinXOut = (await trade.swap({
          tx,
          coinIn: zapCoin,
          client: client,
        })) as TransactionResult;
        tx.mergeCoins(collectedX, [coinXOut]);
      }

      positionThatWillBeCreated = ClmmPosition.fromAmounts({
        owner: position.owner,
        pool: position.pool,
        tickLower,
        tickUpper,
        amountX: expectedMintAmounts.amountX,
        amountY: expectedMintAmounts.amountY,
        useFullPrecision: false,
      });

      const newPositionObject = this.positionManager.increaseLiquidity(
        positionThatWillBeCreated,
        {
          coinXIn: collectedX,
          coinYIn: collectedY,
          slippageTolerance,
          deadline: Number.MAX_SAFE_INTEGER,
          createPosition: true,
        }
      ) as TransactionResult;

      return newPositionObject;
    };
}

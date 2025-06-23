import invariant from 'tiny-invariant';
import { normalizeSuiObjectId } from '@mysten/sui/utils';

import {
  ObjectId,
  Coin,
  Coin as Token,
  removeEmptyFields,
  NETWORK,
  ONE,
  maxBn,
  minBn,
  Percent,
} from '../../core';
import { CONFIGS, CommissionType, BPS, Protocol } from '../constants';
import { IQuoter } from './IQuoter';
import { Route } from '../entities';
import {
  AftermathSwap,
  CetusSwap,
  DeepbookSwap,
  FlowxV2Swap,
  FlowxV3Swap,
  KriyaDexSwap,
  TurbosSwap,
  KriyaV3Swap,
  BluemoveSwap,
  DeepbookV3Swap,
  BluefinSwap,
  FlowxPmmSwap,
  BlueMoveFunSwap,
  HopFunSwap,
  SevenKFunSwap,
  TurbosFunSwap,
  ObricSwap,
  HaedalPMMSwap,
  HaedalSwap,
  SpringSuiSwap,
  AlphaFiSwap,
  VoloLsdSwap,
  AftermathLsdSwap,
  SteammSwap,
  MetastableSwap,
  MagmaFinanceSwap,
  MomentumFinanceSwap,
} from '../entities/protocols';
import JsonBigInt from '../utils/JsonBigInt';
import { BN } from 'bn.js';
import {
  BatchQuoteQueryParams,
  GetRoutesResult,
  SingleQuoteQueryParams,
} from './types';
import { IBatchQuoter } from './IBatchQuoter';
import { ClmmTickMath } from '../../clmm/utils';
import BigNumber from 'bignumber.js';
import { OracleInfo, SteammQuoterType } from '../types';

interface AggregatorQuoterResponse {
  code: number;
  message: string;
  data: AggregatorQuoterResult;
  requestId: string;
}

interface AggregatorQuoterResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  amountInUsd: string;
  amountOutUsd: string;
  priceImpact: string;
  feeToken: string;
  feeAmount: string;
  paths: Path[][];
  protocolConfig: Record<string, any>;
}

interface Path {
  poolId: string;
  source: string;
  sourceType: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  extra:
    | ExtraInfoDefault
    | UniswapV3Extra
    | AftermathExtra
    | FlowxV3Extra
    | FlowxPmmExtra
    | DeepbookExtra
    | DeepbookV3Extra
    | ObricExtra
    | OracleExtra;
}

interface ExtraInfoDefault {
  swapXToY: boolean;
}

interface OracleExtra extends ExtraInfoDefault {
  oracles: OracleInfo[];
}

interface UniswapV3Extra extends ExtraInfoDefault {
  nextStateSqrtRatioX64: string;
  nextStateLiquidity: string;
  nextStateTickCurrent: string;
  minSqrtPriceHasLiquidity: string;
  maxSqrtPriceHasLiquidity: string;
}

interface AftermathExtra extends ExtraInfoDefault {
  lpCoinType: string;
}

interface FlowxV3Extra extends ExtraInfoDefault, UniswapV3Extra {
  fee: number;
}

interface TurbosExtra extends ExtraInfoDefault, UniswapV3Extra {
  poolStructTag: string;
}

interface FlowxPmmExtra extends ExtraInfoDefault {
  swapTimestampMs: number;
  amountInUnused: number;
  signatures: string[];
}

interface DeepbookExtra extends ExtraInfoDefault {
  lotSize: string;
}

interface DeepbookV3Extra extends ExtraInfoDefault {
  deepFee: string;
}

interface ObricExtra extends ExtraInfoDefault, OracleExtra {
  xPriceId: string;
  yPriceId: string;
}

interface SteammExtra extends ExtraInfoDefault, OracleExtra {
  quoterType: string;
  bankX: string;
  bankY: string;
  bankXStructTag: string;
  bankYStructTag: string;
  lendingMarketX: string;
  lendingMarketY: string;
  poolStructTag: string;
}

const AGGREGATOR_BPS = 10000;
export class AggregatorQuoter
  implements IQuoter<Coin, Coin>, IBatchQuoter<Coin, Coin>
{
  constructor(
    public readonly network: NETWORK,
    public readonly apiKey?: string
  ) {}

  private buildPath(path: Path, protocolConfig: any) {
    switch (path.source) {
      case Protocol.FLOWX_V2:
        return new FlowxV2Swap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          protocolConfig,
        });
      case Protocol.FLOWX_V3: {
        const extra = path.extra as FlowxV3Extra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new FlowxV3Swap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          poolFee: extra.fee || '0',
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          protocolConfig,
        });
      }
      case Protocol.AFTERMATH: {
        const extra = path.extra as AftermathExtra;
        return new AftermathSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          lpCoinType: extra.lpCoinType || '',
          protocolConfig,
        });
      }
      case Protocol.CETUS: {
        const extra = path.extra as FlowxV3Extra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new CetusSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          protocolConfig,
        });
      }
      case Protocol.DEEPBOOK: {
        const extra = path.extra as DeepbookExtra;
        return new DeepbookSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          lotSize: extra.lotSize || '0',
          protocolConfig,
        });
      }
      case Protocol.KRIYA_DEX:
        return new KriyaDexSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.TURBOS_FIANCE: {
        const extra = path.extra as TurbosExtra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new TurbosSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          poolStructTag: extra.poolStructTag,
          protocolConfig,
        });
      }
      case Protocol.KRIYA_V3: {
        const extra = path.extra as TurbosExtra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new KriyaV3Swap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          protocolConfig,
        });
      }
      case Protocol.DEEPBOOK_V3: {
        const extra = path.extra as DeepbookV3Extra;
        return new DeepbookV3Swap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          deepFeeAmount: extra.deepFee || '0',
          protocolConfig,
        });
      }
      case Protocol.BLUEMOVE:
        return new BluemoveSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          protocolConfig,
        });
      case Protocol.BLUEFIN: {
        const extra = path.extra as TurbosExtra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new BluefinSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          protocolConfig,
        });
      }
      case Protocol.FLOWX_PMM: {
        const extra = path.extra as FlowxPmmExtra;
        return new FlowxPmmSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: path.extra.swapXToY,
          signatures: extra.signatures,
          swapTimestampMs: extra.swapTimestampMs,
          protocolConfig,
        });
      }
      case Protocol.BLUEMOVE_FUN:
        return new BlueMoveFunSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra?.swapXToY,
          protocolConfig,
        });
      case Protocol.HOP_FUN:
        return new HopFunSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.SEVEN_K_FUN:
        return new SevenKFunSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.TURBOS_FUN:
        return new TurbosFunSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.OBRIC: {
        const extra = path.extra as ObricExtra;
        return new ObricSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          xPriceId: extra.xPriceId ?? '',
          yPriceId: extra.yPriceId ?? '',
          protocolConfig,
        });
      }
      case Protocol.HAEDAL_PMM: {
        const extra = path.extra as OracleExtra;
        return new HaedalPMMSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          oracles: extra.oracles,
          protocolConfig,
        });
      }
      case Protocol.HAEDAL:
        return new HaedalSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.SPRING_SUI:
        return new SpringSuiSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.ALPHA_FI:
        return new AlphaFiSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.VOLO_LSD:
        return new VoloLsdSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.AFTERMATH_LSD:
        return new AftermathLsdSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra.swapXToY,
          protocolConfig,
        });
      case Protocol.STEAMM: {
        const extra = path.extra as SteammExtra;
        return new SteammSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          quoterType: extra.quoterType as SteammQuoterType,
          oracles: extra.oracles,
          bankX: extra.bankX,
          bankY: extra.bankY,
          bankXStructTag: extra.bankXStructTag,
          bankYStructTag: extra.bankYStructTag,
          lendingMarketX: extra.lendingMarketX,
          lendingMarketY: extra.lendingMarketY,
          poolStructTag: extra.poolStructTag,
          protocolConfig,
        });
      }
      case Protocol.METASTABLE: {
        const extra = path.extra as OracleExtra;
        return new MetastableSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          oracles: extra.oracles,
          protocolConfig,
        });
      }
      case Protocol.MAGMA_FINANCE: {
        const extra = path.extra as UniswapV3Extra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new MagmaFinanceSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          protocolConfig,
        });
      }
      case Protocol.MOMENTUM_FINANCE: {
        const extra = path.extra as UniswapV3Extra;
        const [minSqrtPriceX64HasLiquidity, maxSqrtPriceX64HasLiquidity] = [
          new BN(
            extra.minSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MIN_SQRT_RATIO
          ),
          new BN(
            extra.maxSqrtPriceHasLiquidity?.toString() ||
              ClmmTickMath.MAX_SQRT_RATIO
          ),
        ];
        return new MomentumFinanceSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!extra.swapXToY,
          sqrtPriceX64Limit: extra.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity: minBn(
            ClmmTickMath.MAX_SQRT_RATIO.sub(ONE),
            maxSqrtPriceX64HasLiquidity
          ),
          minSqrtPriceX64HasLiquidity: maxBn(
            ClmmTickMath.MIN_SQRT_RATIO.add(ONE),
            minSqrtPriceX64HasLiquidity
          ),
          protocolConfig,
        });
      }

      default:
        throw new Error(`${path.source} protocol not supported yet`);
    }
  }

  async getRoutes(
    params: SingleQuoteQueryParams
  ): Promise<GetRoutesResult<Coin, Coin>> {
    const coinIn = new Coin(params.tokenIn);
    const coinOut = new Token(params.tokenOut);
    const sources = params.includeSources || Object.values(Protocol);
    const excludeSources = params.excludeSources ?? [Protocol.FLOWX_PMM];
    const queryParams: any = {
      apiKey: this.apiKey,
      tokenIn: coinIn.coinType,
      tokenOut: coinOut.coinType,
      amountIn: params.amountIn,
      includeSources: sources.join(','),
      excludeSources: excludeSources.join(','),
      excludePools: params.excludePools
        ?.map((pool) => normalizeSuiObjectId(pool))
        .join(','),
      maxHops: params.maxHops ?? 0,
      splitDistributionPercent: params.splitDistributionPercent ?? 0,
    };

    if (
      params.commission &&
      (params.commission.coin.equals(coinIn) ||
        params.commission.coin.equals(coinOut))
    ) {
      queryParams['feeToken'] = params.commission.coin.coinType;
      if (params.commission.type === CommissionType.PERCENTAGE) {
        queryParams['feeInBps'] = new BN(params.commission.value)
          .mul(new BN(AGGREGATOR_BPS))
          .div(BPS)
          .toString();
      } else {
        queryParams['feeAmount'] = params.commission.value.toString();
      }
    }

    const resp = await fetch(
      `${CONFIGS[this.network].quoter.singleQuoteURI}?` +
        new URLSearchParams(removeEmptyFields(queryParams)).toString(),
      {
        method: 'GET',
        signal: AbortSignal.timeout(
          CONFIGS[this.network].quoter.requestTimeout
        ),
        keepalive: true,
      }
    );
    const rawResp = await resp.text();
    invariant(resp.ok, rawResp);

    try {
      const quoteResponse: AggregatorQuoterResponse = JsonBigInt.parse(rawResp);
      invariant(quoteResponse.code === 0, quoteResponse.message);

      const priceImpact = new BigNumber(quoteResponse.data.priceImpact)
        .multipliedBy(BPS.toString())
        .div(100)
        .toFixed(0);

      return {
        coinIn,
        coinOut,
        amountIn: quoteResponse.data.amountIn,
        amountOut: quoteResponse.data.amountOut,
        priceImpact: new Percent(priceImpact, BPS),
        routes: quoteResponse.data.paths.map(
          (paths) =>
            new Route(
              this.network,
              paths.map((path) =>
                this.buildPath(
                  path,
                  quoteResponse.data.protocolConfig[path.source.toLowerCase()]
                )
              )
            )
        ),
      };
    } catch (error: any) {
      throw new Error(`Get quote failed due to error ${error.message}`);
    }
  }

  async batchQuote(
    params: BatchQuoteQueryParams
  ): Promise<GetRoutesResult<Coin, Coin>> {
    invariant(params.amountIns.length > 0, 'AMOUNT_INS');
    invariant(
      params.amountIns.length === params.amountExpectedOuts.length,
      'LENGTH_MISMATCH'
    );

    const coinIn = new Coin(params.tokenIn);
    const coinOut = new Token(params.tokenOut);
    const reqBody: any = {
      tokenIn: coinIn.coinType,
      tokenOut: coinOut.coinType,
      amountIns: params.amountIns,
      amountExpectedOuts: params.amountExpectedOuts,
      includeSources: params.includeSources?.join(','),
      excludeSources: params.excludeSources?.join(','),
    };

    const resp = await fetch(
      `${CONFIGS[this.network].quoter.batchQuoteURI}?apiKey=${this.apiKey}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(
          CONFIGS[this.network].quoter.requestTimeout
        ),
        body: JSON.stringify(removeEmptyFields(reqBody)),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const batchQuoteResponse: AggregatorQuoterResponse = JsonBigInt.parse(
      await resp.text()
    );
    invariant(batchQuoteResponse.code === 0, batchQuoteResponse.message);

    const priceImpact = new BigNumber(batchQuoteResponse.data.priceImpact)
      .multipliedBy(BPS.toString())
      .div(100)
      .toFixed(0);

    return {
      coinIn,
      coinOut,
      amountIn: batchQuoteResponse.data.amountIn,
      amountOut: batchQuoteResponse.data.amountOut,
      priceImpact: new Percent(priceImpact, BPS),
      routes: batchQuoteResponse.data.paths.map(
        (paths) =>
          new Route(
            this.network,
            paths.map((path) =>
              this.buildPath(
                path,
                batchQuoteResponse.data.protocolConfig[
                  path.source.toLowerCase()
                ]
              )
            )
          )
      ),
    };
  }
}

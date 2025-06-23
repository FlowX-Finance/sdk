import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

import {
  AggregatorQuoter,
  BPS,
  CONFIGS,
  Commission,
  CommissionType,
  MODULE_UNIVERSAL_ROUTER,
  Protocol,
  TradeBuilder,
} from './index';
import { SUI_TYPE_ARG, normalizeStructTag } from '@mysten/sui/utils';
import { ADDRESS_ZERO, Coin } from '../core';
import BigNumber from 'bignumber.js';
import { Transaction } from '@mysten/sui/transactions';

const testCases = {
  [Protocol.FLOWX_V2]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.FLOWX_V3]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.KRIYA_DEX]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.KRIYA_V3]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.TURBOS_FIANCE]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.CETUS]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.AFTERMATH]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.BLUEMOVE]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.BLUEFIN]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.STEAMM]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.MAGMA_FINANCE]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.DEEPBOOK_V3]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 200e9,
  },
  [Protocol.HAEDAL]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI'
    ),
    slippage: BPS,
    amountIn: 200e9,
  },
  [Protocol.SPRING_SUI]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI'
    ),
    slippage: BPS,
    amountIn: 200e9,
  },
  [Protocol.ALPHA_FI]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI'
    ),
    slippage: BPS,
    amountIn: 200e9,
  },
  [Protocol.VOLO_LSD]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT'
    ),
    slippage: BPS,
    amountIn: 200e9,
  },
  [Protocol.AFTERMATH_LSD]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI'
    ),
    slippage: BPS,
    amountIn: 200e9,
  },
  [Protocol.OBRIC]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.HAEDAL_PMM]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
  [Protocol.METASTABLE]: {
    sender:
      '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c',
    tokenIn: normalizeStructTag(SUI_TYPE_ARG),
    tokenOut: normalizeStructTag(
      '0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI'
    ),
    slippage: BPS,
    amountIn: 10e9,
  },
};

describe('UniversalRouter', () => {
  const network = 'mainnet';
  const client = new SuiClient({ url: getFullnodeUrl(network) });

  describe('#Quoter', () => {
    it('single quote', async () => {
      const input: any = {
        sender: ADDRESS_ZERO,
        tokenIn:
          '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
        tokenOut: normalizeStructTag(SUI_TYPE_ARG),
        slippage: BPS,
        amountIn: '10000000',
      };
      const quoter = new AggregatorQuoter(network, 'test');
      const result = await quoter.getRoutes({
        ...input,
      });
      expect(result.amountIn).toEqual(result.amountIn);
      expect(result.coinIn.coinType).toEqual(input.tokenIn);
      expect(result.coinOut.coinType).toEqual(input.tokenOut);
      expect(result.routes.length).toBeGreaterThan(0);
      expect(
        result.routes
          .reduce((memo, route) => memo + Number(route.amountIn), 0)
          .toString()
      ).toEqual(result.amountIn);
      expect(
        result.routes
          .reduce((memo, route) => memo + Number(route.amountOut), 0)
          .toString()
      ).toEqual(result.amountOut);
      for (const route of result.routes) {
        expect(route.input.coinType).toEqual(input.tokenIn);
        expect(route.output.coinType).toEqual(input.tokenOut);
      }
    });

    it('batch quote', async () => {
      const input: any = {
        sender: ADDRESS_ZERO,
        tokenIn:
          '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
        tokenOut: normalizeStructTag(SUI_TYPE_ARG),
        slippage: BPS,
        amountIns: ['10000000', '50000000', '1000000000'],
        amountExpectedOuts: ['1232670434', '6163322753', '123252478238'],
      };
      const quoter = new AggregatorQuoter(network, 'test');
      const result = await quoter.batchQuote({
        ...input,
      });
      expect(input.amountIns).toEqual(
        expect.arrayContaining([result.amountIn.toString()])
      );
      expect(
        input.amountExpectedOuts.some(
          (expected: string) => Number(expected) <= Number(result.amountOut)
        )
      );
      expect(result.coinIn.coinType).toEqual(input.tokenIn);
      expect(result.coinOut.coinType).toEqual(input.tokenOut);
      expect(result.routes.length).toBeGreaterThan(0);
      expect(
        result.routes
          .reduce((memo, route) => memo + Number(route.amountIn), 0)
          .toString()
      ).toEqual(result.amountIn);
      expect(
        result.routes
          .reduce((memo, route) => memo + Number(route.amountOut), 0)
          .toString()
      ).toEqual(result.amountOut);
      for (const route of result.routes) {
        expect(route.input.coinType).toEqual(input.tokenIn);
        expect(route.output.coinType).toEqual(input.tokenOut);
      }
    });
  });

  describe('#Without commission', () => {
    const protocols = Object.keys(testCases);
    for (const protocol of protocols) {
      it(`should swap on ${protocol} correctly`, async () => {
        const quoter = new AggregatorQuoter(network);

        const testCase = testCases[protocol];
        const result = await quoter.getRoutes({
          ...testCase,
          includeSources: [protocol].filter((item) => !!item),
          excludeSources: [],
        });
        const tradeBuilder = TradeBuilder.fromRoutes(result.routes);
        const tx = new Transaction();
        const coinOut: any = await tradeBuilder
          .sender(testCase.sender)
          .slippage(testCase.slippage)
          .build()
          .swap({ client, tx });
        tx.transferObjects([coinOut], testCase.sender);

        const resp = await client.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: testCase.sender,
        });

        if (resp.effects.status.status !== 'success') {
          console.dir(resp.error, { depth: 10 });
        }

        expect(resp.effects.status.status === 'success').toBeTruthy();

        const amountOut: string = (
          resp.events.find(
            (event) =>
              event.type ===
              `${CONFIGS[network].packageIdOld}::${MODULE_UNIVERSAL_ROUTER}::Swap`
          )?.parsedJson as any
        )?.amount_out;

        const lt = new BigNumber(amountOut).lt(
          new BigNumber(result.amountOut.toString()).multipliedBy(1.2)
        );
        const gt = new BigNumber(amountOut).gt(
          new BigNumber(result.amountOut.toString()).multipliedBy(0.8)
        );

        expect(lt && gt).toBeTruthy();
      });
    }
  });

  describe('#With commission', () => {
    const protocols = Object.keys(testCases);
    for (const protocol of protocols) {
      it(`should swap on ${protocol} with commission on input correctly`, async () => {
        const quoter = new AggregatorQuoter(network);

        const testCase = testCases[protocol];
        const commission = new Commission(
          ADDRESS_ZERO,
          new Coin(testCase.tokenIn),
          CommissionType.PERCENTAGE,
          1000
        );
        const result = await quoter.getRoutes({
          ...testCase,
          includeSources: [protocol].filter((item) => !!item),
          commission,
          excludeSources: [],
        });
        const tradeBuilder = TradeBuilder.fromRoutes(result.routes);
        const tradeTx = await tradeBuilder
          .sender(testCase.sender)
          .slippage(testCase.slippage)
          .recipient(testCase.sender)
          .commission(commission)
          .build()
          .buildTransaction({ client });

        const resp = await client.devInspectTransactionBlock({
          transactionBlock: tradeTx,
          sender: testCase.sender,
        });

        if (resp.effects.status.status !== 'success') {
          console.dir(resp.error, { depth: 10 });
        }

        expect(resp.effects.status.status === 'success').toBeTruthy();

        const amountOut: string = (
          resp.events.find(
            (event) =>
              event.type ===
              `${CONFIGS[network].packageIdOld}::${MODULE_UNIVERSAL_ROUTER}::Swap`
          )?.parsedJson as any
        )?.amount_out;

        const lt = new BigNumber(amountOut).lt(
          new BigNumber(result.amountOut.toString()).multipliedBy(1.2)
        );
        const gt = new BigNumber(amountOut).gt(
          new BigNumber(result.amountOut.toString()).multipliedBy(0.8)
        );

        expect(lt && gt).toBeTruthy();
      });

      it(`should swap on ${protocol} with commission on output correctly`, async () => {
        const quoter = new AggregatorQuoter(network);

        const testCase = testCases[protocol];
        const commission = new Commission(
          ADDRESS_ZERO,
          new Coin(testCase.tokenOut),
          CommissionType.PERCENTAGE,
          1000
        );

        const result = await quoter.getRoutes({
          ...testCase,
          includeSources: [protocol].filter((item) => !!item),
          commission,
        });
        const tradeBuilder = TradeBuilder.fromRoutes(result.routes);
        const tradeTx = await tradeBuilder
          .sender(testCase.sender)
          .slippage(testCase.slippage)
          .recipient(testCase.sender)
          .commission(commission)
          .build()
          .buildTransaction({ client });

        const resp = await client.devInspectTransactionBlock({
          transactionBlock: tradeTx,
          sender: testCase.sender,
        });

        if (resp.effects.status.status !== 'success') {
          console.dir(resp.error, { depth: 10 });
        }

        expect(resp.effects.status.status === 'success').toBeTruthy();

        const amountOut: string = (
          resp.events.find(
            (event) =>
              event.type ===
              `${CONFIGS[network].packageIdOld}::${MODULE_UNIVERSAL_ROUTER}::Swap`
          )?.parsedJson as any
        )?.amount_out;

        const lt = new BigNumber(amountOut).lt(
          new BigNumber(result.amountOut.toString()).multipliedBy(1.2)
        );
        const gt = new BigNumber(amountOut).gt(
          new BigNumber(result.amountOut.toString()).multipliedBy(0.8)
        );

        expect(lt && gt).toBeTruthy();
      });
    }
  });
});

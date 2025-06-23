# Official FlowX Finance TypeScript SDK for Sui

An FlowX Typescript SDK is a software development kit that allows developers to interact with FlowX protocols using the Typescript programming language.

# Features

- Retrieve coin
- Retrieve transaction block liquidity management V2 (add,remove)
- Retrieve transaction block for swap aggregator

# Getting Started

```
npm i @flowx-finance/sdk
```

## Retrieve coin

Get instance of `Coin[]`

```typescript
const coins = await coinProvider.getCoins({
  coinTypes: ['0x2::sui::SUI'],
});
```

## Swap Aggregator

### Get Swap Route

WARNING: `amountOut` FROM QUOTE WHEN USE WITH COMMISSION ONLY FOR DISPLAY, NOT FOR CALCULATE ONCHAIN.

To find best route for swap

```typescript
const quoter = new AggregatorQuoter('mainnet');
const params: AggregatorQuoterQueryParams = {
  tokenIn: '0x2::sui::SUI',
  tokenOut: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  amountIn: '1000000000',
  includeSources: null, //optional
  excludeSources: null, //optional
  commission: null, //optional, and will be explain later
};

const routes = await quoter.getRoutes(params);
```

**Use function getRoutes in instance AggregatorQuoter with it's arguments to create a Route**

| Arguments        | Description                                                                                              | Type               | Example                 |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------- |
| `tokenIn`        | Token to be swapped from                                                                                 | string             | '0x2::sui::SUI'         |
| `tokenOut`       | Token to be received                                                                                     | string             | '0x5d....f::coin::COIN' |
| `amountIn`       | Amount of `tokenIn` to be swapped                                                                        | string             | '1000000000'            |
| `includeSources` | Optional: Sources to include in aggregation                                                              | null \| Protocol[] | null                    |
| `excludeSources` | Optional: Sources to exclude in aggregation                                                              | null \| Protocol[] | null                    |
| `commission`     | Optional: Commission amount for the transaction, use when you want calculate commission with partner fee | null \| Commission | null                    |

### Build Transaction for aggregator swap

Build transaction that you can use with SuiClient or Dapp-kit

```typescript
const tradeBuilder = new TradeBuilder(NETWORK.MAINNET, routes); //routes get from quoter
const trade = tradeBuilder
  .sender('0xSenderAddress') //Optional if you want pass coin later
  .amountIn('1000000000')
  .slippage((1 / 100) * 1e6) // Slippage 1%
  .deadline(Date.now() + 3600) // 1 hour from now
  .commission(null) // Optional: commission will be explain later
  .amountOut('500000000000000000') //Deprecated in next version: Estimate amount out, be careful when use with Commission, usually should not be used, because we always calculate amount out from routes
  .build();
console.log(trade); // Output: Trade object with configured parameters
const txb = trade.swap({ client }) // You can also pass coinIn and exist TractionBlock if you want
```

### Find route and build transaction with commission

The `Commission` class represents a commission configuration for transactions, defining the partner, commission type, and value. It includes methods for computing the commission amount based on the specified type.

```typescript
const commission = new Commission('0xPartnerAddress', new Coin('0x2::sui:SUI'), CommissionType.PERCENTAGE, '500', true);
```

if `CommissionType.PERCENTAGE` then `value` should be input `1/100 * 1e6` it is example of 1%
if `CommissionType.FLAT` then `value` should be the amount of token you want to fee include decimals
Then you should pass `commission` variable to both `tradeBuilder` and `getRoutes` for exact values

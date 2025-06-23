import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Coin } from '../core';
import { BN } from 'bn.js';
import { LimitOrderBuilder } from './LimitOrderBuilder';
import { OrderBCS, QueryResultBCS } from './';
import { generateSigner } from '../core/utils/generateSigner';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

describe('Limit Order Test', () => {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });

  it(`Create order success`, async () => {
    const coinMaker = new Coin('0x2::sui::SUI');
    const coinTaker = new Coin(
      '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC'
    );
    const sender =
      '0x5c7d7ce9c26c582a1b15be5d6b3049fa51f110bcbf386bcb6e91dab668d36785';
    const makingAmount = 0.001 * 1e9;
    const takingAmount = 1 * 1e6;

    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet')
      .coinMaker(coinMaker)
      .coinTaker(coinTaker)
      .suiClient(client)
      .sender(sender);
    await txb.placeOrder({
      amountIn: new BN(makingAmount),
      amountOutExpected: new BN(takingAmount),
      expiredTimestamp: 0,
    });

    const resp = await client.devInspectTransactionBlock({
      transactionBlock: txb.getTx(),
      sender: sender,
    });

    const parsedJson = resp.events[0].parsedJson as any;
    expect(resp.effects.status.status === 'success').toBeTruthy();
    expect(parsedJson.making_amount == makingAmount).toBeTruthy();
    expect(parsedJson.taking_amount == takingAmount).toBeTruthy();
    expect(parsedJson.recipient === sender).toBeTruthy();
  });

  it(`Cancel order success`, async () => {
    const coinMaker = new Coin('0x2::sui::SUI');
    const coinTaker = new Coin(
      '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC'
    );
    const sender =
      '0x5c7d7ce9c26c582a1b15be5d6b3049fa51f110bcbf386bcb6e91dab668d36785';

    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet')
      .coinMaker(coinMaker)
      .coinTaker(coinTaker);

    await txb.cancelOrder({
      orderId: 1,
    });

    const resp = await client.devInspectTransactionBlock({
      transactionBlock: txb.getTx(),
      sender: sender,
    });

    const parsedJson = resp.events[0].parsedJson as any;
    expect(resp.effects.status.status === 'success').toBeTruthy();
    expect(parsedJson.sender === sender).toBeTruthy();
  });

  it(`Take order success`, async () => {
    const coinMaker = new Coin('0x2::sui::SUI');
    const coinTaker = new Coin(
      '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC'
    );
    const sender =
      '0xebe561651702e42544dba42e439f39c3ed86de8b24b92e0ae0b9ac2463336585';

    const makingAmount = 0.001 * 1e9;

    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet')
      .coinMaker(coinMaker)
      .coinTaker(coinTaker)
      .suiClient(client);
    await txb.takeOrder({
      orderId: 1,
      amount: makingAmount,
    });

    const resp = await client.devInspectTransactionBlock({
      transactionBlock: txb.getTx(),
      sender: sender,
    });

    expect(resp.effects.status.status === 'success').toBeTruthy();
  });

  it(`Fill order success`, async () => {
    const coinMaker = new Coin('0x2::sui::SUI');
    const coinTaker = new Coin(
      '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC'
    );
    const sender =
      '0xebe561651702e42544dba42e439f39c3ed86de8b24b92e0ae0b9ac2463336585';

    const makingAmount = 0.0005 * 1e9;
    const takingAmount = 0.5 * 1e6;

    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet')
      .coinMaker(coinMaker)
      .coinTaker(coinTaker)
      .suiClient(client);

    const [coin, receipt] = await txb.takeOrder({
      orderId: 1,
      amount: makingAmount,
    });

    txb.getTx().transferObjects([coin], sender);

    await txb.fillOrder({
      filled: await new Coin(
        '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC'
      ).take({
        owner: sender,
        amount: takingAmount,
        tx: txb.getTx(),
        client: client,
      }),
      receipt: receipt,
    });

    const resp = await client.devInspectTransactionBlock({
      transactionBlock: txb.getTx(),
      sender: sender,
    });

    const parsedJson = resp.events[0].parsedJson as any;
    expect(resp.effects.status.status === 'success').toBeTruthy();
    expect(parsedJson.taker === sender).toBeTruthy();
    expect(parsedJson.remaining_amount == takingAmount).toBeTruthy();
  });

  it(`Get orders success`, async () => {
    const sender =
      '0x5c7d7ce9c26c582a1b15be5d6b3049fa51f110bcbf386bcb6e91dab668d36785';
    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet').suiClient(client);
    await txb.getOrders({
      owner: sender,
      limit: 50,
    });
    const resp = (
      await client.devInspectTransactionBlock({
        transactionBlock: txb.getTx(),
        sender: sender,
      })
    ).results;

    const orders = QueryResultBCS.parse(
      new Uint8Array(resp![resp ? resp.length - 1 : 0].returnValues![0][0])
    );
    console.log('orders', orders);

    expect(Number(orders.total) >= 1).toBeTruthy();
    expect(orders.orders[0].order_id === '1').toBeTruthy();
    expect(orders.orders[0].maker === sender).toBeTruthy();
  });

  it(`Get order success`, async () => {
    const sender =
      '0x5c7d7ce9c26c582a1b15be5d6b3049fa51f110bcbf386bcb6e91dab668d36785';
    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet').suiClient(client);
    await txb.getOrder({
      orderId: 1,
    });
    const resp = (
      await client.devInspectTransactionBlock({
        transactionBlock: txb.getTx(),
        sender: sender,
      })
    ).results;

    const orders =
      resp?.map((it) =>
        OrderBCS.parse(new Uint8Array(it.returnValues![0][0]))
      ) ?? [];

    expect(orders[0].order_id === '1').toBeTruthy();
    expect(orders[0].maker === sender).toBeTruthy();
  });

  it(`Check order existent`, async () => {
    const sender =
      '0x5c7d7ce9c26c582a1b15be5d6b3049fa51f110bcbf386bcb6e91dab668d36785';
    const txb = await LimitOrderBuilder.createInstance<
      LimitOrderBuilder<Coin, Coin>
    >('testnet').suiClient(client);
    await txb.orderExists({
      orderId: 1,
    });
    await txb.orderExists({
      orderId: 999,
    });
    const resp = (
      await client.devInspectTransactionBlock({
        transactionBlock: txb.getTx(),
        sender: sender,
      })
    ).results;

    const results =
      resp?.map((it) =>
        bcs.bool().parse(new Uint8Array(it.returnValues![0][0]))
      ) ?? [];

    expect(results[0]).toBeTruthy();
    expect(results[1]).toBeFalsy();
  });
});

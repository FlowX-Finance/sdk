import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, SUI_TYPE_ARG } from '@mysten/sui/utils';
import { AutoInvest } from './AutoInvest';
import { ADDRESS_ZERO, Coin } from '../core';
import { PlanBuilder } from './builder';
import { SubscriptionCycle } from './plan';
import { MAPPING_INVESTMENT_OBJECT_ID, ONE_DAY } from './constants';
import { generateSigner } from '../core/utils/generateSigner';

describe('Auto-invest test', () => {
  const network = 'testnet';
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const autoInvest = new AutoInvest(network);
  const sender =
    '0x5c7d7ce9c26c582a1b15be5d6b3049fa51f110bcbf386bcb6e91dab668d36785';
  const USDC =
    '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC';
  const start = Math.floor(Date.now() / 1000) * 1000;

  const getNextPlanId = async () => {
    const investmentObject = await client.getObject({
      id: MAPPING_INVESTMENT_OBJECT_ID[network],
      options: {
        showContent: true,
      },
    });

    return investmentObject.data?.content?.['fields']?.next_plan_id;
  };

  it('should allow deposit coin', async () => {
    const sui = new Coin(normalizeStructTag(SUI_TYPE_ARG));

    const amount = 0.1 * 1e9;
    const tx = new Transaction();
    autoInvest.tx(tx);
    autoInvest.deposit({
      type: SUI_TYPE_ARG,
      object: await sui.take({
        owner: sender,
        amount,
        client,
        tx,
        isDevInspect: true,
      }),
    });

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });

    expect(reps.effects.status.status === 'success').toBeTruthy();
    expect(reps.events[0].parsedJson?.['amount']).toEqual(amount.toString());
    expect(
      normalizeStructTag(reps.events[0].parsedJson?.['asset']?.['name'])
    ).toEqual(normalizeStructTag(SUI_TYPE_ARG));
  });

  it('should allow withdraw coin', async () => {
    const sui = new Coin(normalizeStructTag(SUI_TYPE_ARG));

    const amount = 0.1 * 1e9;
    const tx = new Transaction();
    autoInvest.tx(tx);
    autoInvest.deposit({
      type: SUI_TYPE_ARG,
      object: await sui.take({
        owner: sender,
        amount,
        client,
        tx,
        isDevInspect: true,
      }),
    });
    autoInvest.withdraw({
      type: SUI_TYPE_ARG,
      amount,
    });

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });

    expect(reps.effects.status.status === 'success').toBeTruthy();
    expect(reps.events[1].parsedJson?.['amount']).toEqual(amount.toString());
    expect(
      normalizeStructTag(reps.events[1].parsedJson?.['asset']?.['name'])
    ).toEqual(normalizeStructTag(SUI_TYPE_ARG));
  });

  it('should allow create plan', async () => {
    const planId = await getNextPlanId();
    const planBuilder = new PlanBuilder();
    const plan = planBuilder
      .setOwner(sender)
      .setSubscriptionAmount(1000)
      .setSubscriptionCycle(SubscriptionCycle.DAY, BigInt(1))
      .setExecutionLimit(10)
      .setSourceAsset(USDC)
      .setTargetAsset(SUI_TYPE_ARG)
      .build();

    const tx = new Transaction();
    autoInvest.tx(tx);
    autoInvest.createPlan(plan);

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    expect(reps.effects.status.status === 'success').toBeTruthy();

    const {
      plan_id,
      source_asset,
      target_asset,
      owner,
      receiver,
      subscription_amount,
      subscription_interval,
      execution_limit,
    } = (reps.events[0].parsedJson ?? {}) as any;

    expect(plan_id).toEqual(planId);
    expect(normalizeStructTag(source_asset.name)).toEqual(
      normalizeStructTag(USDC)
    );
    expect(normalizeStructTag(target_asset.name)).toEqual(
      normalizeStructTag(SUI_TYPE_ARG)
    );
    expect(owner).toEqual(sender);
    expect(receiver).toEqual(sender);
    expect(subscription_amount).toEqual('1000');
    expect(subscription_interval).toEqual(ONE_DAY.toString());
    expect(execution_limit).toEqual('10');
  });

  it('should allow pause plan', async () => {
    const planId = await getNextPlanId();
    const planBuilder = new PlanBuilder();
    const plan = planBuilder
      .setOwner(sender)
      .setSubscriptionAmount(1000)
      .setSubscriptionCycle(SubscriptionCycle.DAY, BigInt(1))
      .setExecutionLimit(10)
      .setSourceAsset(USDC)
      .setTargetAsset(SUI_TYPE_ARG)
      .build();

    const tx = new Transaction();
    autoInvest.tx(tx);
    autoInvest.createPlan(plan);
    autoInvest.pausePlan({ planId });

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    expect(reps.effects.status.status === 'success').toBeTruthy();

    const { plan_id, next_execution_time } = (reps.events[1].parsedJson ??
      {}) as any;

    expect(plan_id).toEqual(planId);
    expect(Number(next_execution_time)).toBeGreaterThan(start);
    expect(Number(next_execution_time)).toBeLessThan(Date.now());
  });

  it('should allow unpause plan', async () => {
    const planId = await getNextPlanId();
    const planBuilder = new PlanBuilder();
    const plan = planBuilder
      .setOwner(sender)
      .setSubscriptionAmount(1000)
      .setSubscriptionCycle(SubscriptionCycle.DAY, BigInt(1))
      .setExecutionLimit(10)
      .setSourceAsset(USDC)
      .setTargetAsset(SUI_TYPE_ARG)
      .build();

    const tx = new Transaction();
    autoInvest.tx(tx);
    autoInvest.createPlan(plan);
    autoInvest.pausePlan({ planId });
    autoInvest.unpausePlan({ planId });

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    expect(reps.effects.status.status === 'success').toBeTruthy();

    const { plan_id, next_execution_time } = (reps.events[2].parsedJson ??
      {}) as any;

    expect(plan_id).toEqual(planId);
    expect(Number(next_execution_time)).toBeGreaterThan(start);
    expect(Number(next_execution_time)).toBeLessThan(Date.now());
  });

  it('should allow remove plan', async () => {
    const planId = await getNextPlanId();
    const planBuilder = new PlanBuilder();
    const plan = planBuilder
      .setOwner(sender)
      .setSubscriptionAmount(1000)
      .setSubscriptionCycle(SubscriptionCycle.DAY, BigInt(1))
      .setExecutionLimit(10)
      .setSourceAsset(USDC)
      .setTargetAsset(SUI_TYPE_ARG)
      .build();

    const tx = new Transaction();
    autoInvest.tx(tx);
    autoInvest.createPlan(plan);
    autoInvest.removePlan({ planId });

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    expect(reps.effects.status.status === 'success').toBeTruthy();

    const { plan_id, next_execution_time } = (reps.events[1].parsedJson ??
      {}) as any;

    expect(plan_id).toEqual(planId);
    expect(Number(next_execution_time)).toBeGreaterThan(start);
    expect(Number(next_execution_time)).toBeLessThan(Date.now());
  });

  it('should allow execute plan', async () => {
    const usdc = new Coin(USDC);
    const sui = new Coin(SUI_TYPE_ARG);
    const planId = await getNextPlanId();
    const planBuilder = new PlanBuilder();
    const plan = planBuilder
      .setPlanId(planId)
      .setOwner(sender)
      .setSubscriptionAmount(1000)
      .setSubscriptionCycle(SubscriptionCycle.DAY, BigInt(1))
      .setExecutionLimit(10)
      .setSourceAsset(USDC)
      .setTargetAsset(SUI_TYPE_ARG)
      .build();

    const tx = new Transaction();
    autoInvest.tx(tx);

    const usdcTook = await usdc.take({
      owner: sender,
      amount: 1000,
      client,
      tx,
      isDevInspect: true,
    });
    autoInvest.deposit({
      type: USDC,
      object: usdcTook,
    });
    autoInvest.createPlan(plan);

    const { sourceCoin, receipt } = autoInvest.takePlan(plan);
    const suiTook = await sui.take({
      owner: sender,
      amount: 100000,
      client,
      tx,
      isDevInspect: true,
    });

    autoInvest.executePlan(plan, receipt, suiTook);
    tx.transferObjects([sourceCoin], sender);

    const reps = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    expect(reps.effects.status.status === 'success').toBeTruthy();

    const {
      plan_id,
      executor,
      purchased_amount,
      fee_amount,
      execution_count,
      next_execution_time,
    } = (reps.events[2].parsedJson ?? {}) as any;

    expect(plan_id).toEqual(planId);
    expect(executor).toEqual(sender);
    expect(purchased_amount).toEqual('100000');
    expect(fee_amount).toEqual('0');
    expect(execution_count).toEqual('1');
  });

  it('should allow check plan exists', async () => {
    const nextPlanId = await getNextPlanId();
    const planIds = ['1', nextPlanId];
    const results = await autoInvest.planExists(planIds);
    expect(results[0]).toBeTruthy();
    expect(results[1]).toBeFalsy();
  });

  it('should allow query plans', async () => {
    {
      const queryResult = await autoInvest.queryPlans({
        owner: sender,
        desc: false,
      });

      expect(queryResult.plans.length).toEqual(1);
      expect(queryResult.cursor).toEqual('1');
      expect(queryResult.hasNextPage).toBeFalsy();
      expect(queryResult.total).toEqual(1);
    }
  });

  it('should allow get account balance', async () => {
    {
      const balance = await autoInvest.getAccountBalance(USDC, sender);
      expect(balance).toEqual('0');
    }

    {
      const balance = await autoInvest.getAccountBalance(USDC, ADDRESS_ZERO);
      expect(balance).toEqual('0');
    }
  });
});

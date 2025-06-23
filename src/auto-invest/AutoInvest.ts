import { normalizeStructTag, SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { ADDRESS_ZERO, BigintIsh, NETWORK } from '../core';
import { TxBuilder } from '../core/entities';
import {
  FLOAT_SCALING,
  MAPPING_INVESTMENT_OBJECT_ID,
  MAPPING_PACKAGE_ID,
  MODULE_AUTO_INVEST,
  MODULE_PLAN_QUERY,
} from './constants';
import { MissingConfiguration } from './errors';
import { Plan, PlanIdentifier, PlanStatus } from './plan';
import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from '@mysten/sui/transactions';
import {
  ExecutionPlanResult,
  PlanQueryFilter,
  QueryResult,
  QueryResultBCS,
  WithdrawResult,
} from './types';
import BigNumber from 'bignumber.js';
import { bcs } from '@mysten/sui/bcs';

export class AutoInvest extends TxBuilder {
  public readonly packageId!: string;
  public readonly investmentObjectId!: string;

  constructor(network: NETWORK) {
    super(network);
    if (MAPPING_PACKAGE_ID[network] == undefined) {
      throw new MissingConfiguration('packageId', network);
    }
    this.packageId = MAPPING_PACKAGE_ID[network];

    if (MAPPING_INVESTMENT_OBJECT_ID[network] == undefined) {
      throw new MissingConfiguration('investmentObjectId', network);
    }
    this.investmentObjectId = MAPPING_INVESTMENT_OBJECT_ID[network];
  }

  deposit(coin: { type: string; object: string | TransactionArgument }) {
    const tx = this.getTx();

    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::deposit`,
      typeArguments: [coin.type],
      arguments: [
        tx.object(this.investmentObjectId),
        typeof coin.object === 'string' ? tx.object(coin.object) : coin.object,
      ],
    });
  }

  withdraw(coinAmount: { type: string; amount: BigintIsh }): WithdrawResult {
    const tx = this.getTx();
    const withdrawn = tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::withdraw`,
      typeArguments: [coinAmount.type],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(coinAmount.amount.toString()),
      ],
    });

    return {
      withdrawn,
    };
  }

  createPlan(plan: Plan) {
    const tx = this.getTx();

    const subscriptionStartTimeOpt = this.createU64Option(
      plan.info.subscriptionStartTime?.toString()
    );
    const executionLimitOpt = this.createU64Option(
      plan.info.executionLimit?.toString()
    );
    const receiverOpt = this.createAddressOption(
      plan.info.receiver?.toString()
    );

    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::create_plan`,
      typeArguments: [plan.info.sourceAsset, plan.info.targetAsset],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(plan.info.subscriptionAmount.toString()),
        tx.pure.u64(plan.info.subscriptionInterval),
        subscriptionStartTimeOpt,
        executionLimitOpt,
        receiverOpt,
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  takePlan(plan: Plan): ExecutionPlanResult {
    const tx = this.getTx();
    const [sourceCoin, receipt] = tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::take_plan`,
      typeArguments: [plan.info.sourceAsset],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(plan.info.planId),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    return {
      sourceCoin,
      receipt,
    };
  }

  executePlan(
    plan: Plan,
    executionReceipt: any,
    purchasedCoin:
      | TransactionResult
      | {
          $kind: 'NestedResult';
          NestedResult: [number, number];
        }
  ) {
    const tx = this.getTx();
    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::execute_plan`,
      typeArguments: [plan.info.targetAsset],
      arguments: [
        tx.object(this.investmentObjectId),
        executionReceipt,
        purchasedCoin,
      ],
    });
  }

  removePlan(identifier: PlanIdentifier) {
    const tx = this.getTx();
    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::remove_plan`,
      typeArguments: [],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(identifier.planId),
      ],
    });
  }

  removePlanAndWithdraw(identifier: PlanIdentifier, coinType: string) {
    const tx = this.getTx();
    return tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::remove_plan_and_withdraw`,
      typeArguments: [coinType],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(identifier.planId),
      ],
    });
  }

  pausePlan(identifier: PlanIdentifier) {
    const tx = this.getTx();
    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::pause_plan`,
      typeArguments: [],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(identifier.planId),
      ],
    });
  }

  unpausePlan(identifier: PlanIdentifier) {
    const tx = this.getTx();
    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::unpause_plan`,
      typeArguments: [],
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.u64(identifier.planId),
      ],
    });
  }

  async planExists(planIds: string[]): Promise<boolean[]> {
    const tx = new Transaction();
    this.tx(tx);

    for (const planId of planIds) {
      tx.moveCall({
        target: `${this.packageId}::${MODULE_AUTO_INVEST}::plan_exists`,
        arguments: [tx.object(this.investmentObjectId), tx.pure.u64(planId)],
      });
    }

    const resp = await this._client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: ADDRESS_ZERO,
    });

    return (
      resp.results?.map((result) =>
        bcs.Bool.parse(new Uint8Array(result.returnValues?.[0]?.[0] ?? []))
      ) ?? []
    );
  }

  async queryPlans(filters: PlanQueryFilter): Promise<QueryResult> {
    const tx = new Transaction();
    this.tx(tx);

    const cursorOpt = this.createU64Option(filters.cursor);
    const limitOpt = this.createU64Option(filters.limit?.toString());
    const descOpt = this.createBooleanOption(filters.desc);

    tx.moveCall({
      target: `${this.packageId}::${MODULE_PLAN_QUERY}::query_plans`,
      arguments: [
        tx.object(this.investmentObjectId),
        tx.pure.address(filters.owner),
        cursorOpt,
        limitOpt,
        descOpt,
      ],
    });

    const results = (
      await this._client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: ADDRESS_ZERO,
      })
    ).results;

    if (!results) {
      return {
        plans: [],
        cursor: null,
        hasNextPage: false,
        total: 0,
      };
    }

    const queryResult = QueryResultBCS.parse(
      new Uint8Array(
        results?.[results ? results.length - 1 : 0]?.returnValues?.[0]?.[0] ??
          []
      )
    );

    const BN = BigNumber.clone();
    BN.set({
      ROUNDING_MODE: BN.ROUND_FLOOR,
    });

    return {
      plans: queryResult.plans.map(
        (plan) =>
          new Plan({
            planId: plan.plan_id,
            subscriptionAmount: plan.subscription_amount,
            subscriptionInterval: Number(plan.subscription_interval),
            firstExecutionTime:
              Number(plan.next_execution_time) -
              Number(plan.subscription_interval) * Number(plan.execution_count),
            nextExecutionTime: Number(plan.next_execution_time),
            executionCount: Number(plan.execution_count),
            executionLimit: Number(plan.execution_limit),
            averagePrice: new BN(plan.average_price)
              .div(FLOAT_SCALING)
              .toString(),
            totalPurchasedAmount: plan.total_purchased_amount,
            owner: plan.owner,
            receiver: plan.receiver,
            sourceAsset: normalizeStructTag(plan.source_asset.name),
            targetAsset: normalizeStructTag(plan.target_asset.name),
            creationTime: Number(plan.creation_time),
            status: plan.paused ? PlanStatus.PAUSED : PlanStatus.ONGOING,
          })
      ),
      cursor: queryResult.cursor,
      hasNextPage: queryResult.has_nex_page,
      total: Number(queryResult.total),
    };
  }

  async getAccountBalance(coinType: string, account: string): Promise<string> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::${MODULE_AUTO_INVEST}::get_account_balance`,
      typeArguments: [coinType],
      arguments: [tx.object(this.investmentObjectId), tx.pure.address(account)],
    });

    const results = (
      await this._client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: ADDRESS_ZERO,
      })
    ).results;

    return results
      ? bcs.U64.parse(new Uint8Array(results[0]?.returnValues?.[0]?.[0] ?? []))
      : '0';
  }
}

import { BigintIsh } from '../../core';

import { Plan, PlanInfo, PlanStatus, SubscriptionCycle } from '../plan';
import { calculateSubscriptionInterval } from '../utils';
import invariant from 'tiny-invariant';
import { isValidSuiAddress, parseStructTag } from '@mysten/sui/utils';
import { isNil } from 'lodash';

export class PlanBuilder {
  public readonly info: Partial<PlanInfo> = {};

  setPlanId(planId: string): PlanBuilder {
    this.info.planId = planId;
    return this;
  }

  setSubscriptionAmount(subscriptionAmount: BigintIsh): PlanBuilder {
    this.info.subscriptionAmount = subscriptionAmount;
    return this;
  }

  setSubscriptionStartTime(subscriptionStartTime: number): PlanBuilder {
    this.info.subscriptionStartTime = subscriptionStartTime;
    return this;
  }

  setSubscriptionCycle(
    cycle: SubscriptionCycle,
    quantity: bigint
  ): PlanBuilder {
    this.info.subscriptionInterval = calculateSubscriptionInterval(
      cycle,
      quantity
    );
    return this;
  }

  setExecutionCount(count: number): PlanBuilder {
    this.info.executionCount = count;
    return this;
  }

  setExecutionLimit(limit: number): PlanBuilder {
    this.info.executionLimit = limit;
    return this;
  }

  setAveragePrice(avgPrice: string): PlanBuilder {
    this.info.averagePrice = avgPrice;
    return this;
  }

  setTotalPurchasedAmount(totalPurchasedAmount: string): PlanBuilder {
    this.info.totalPurchasedAmount = totalPurchasedAmount;
    return this;
  }

  setOwner(owner: string): PlanBuilder {
    this.info.owner = owner;
    return this;
  }

  setReceiver(receiver: string): PlanBuilder {
    this.info.receiver = receiver;
    return this;
  }

  setSourceAsset(sourceAsset: string): PlanBuilder {
    this.info.sourceAsset = sourceAsset;
    return this;
  }

  setTargetAsset(targetAsset: string): PlanBuilder {
    this.info.targetAsset = targetAsset;
    return this;
  }

  setCreationTime(creationTime: number): PlanBuilder {
    this.info.creationTime = creationTime;
    return this;
  }

  setStatus(status: PlanStatus): PlanBuilder {
    this.info.status = status;
    return this;
  }

  build(): Plan {
    invariant(
      this.info.subscriptionAmount != undefined,
      'subscriptionAmount not set'
    );
    invariant(
      this.info.subscriptionInterval != undefined,
      'subscriptionInterval not set'
    );
    invariant(this.info.sourceAsset != undefined, 'sourceAsset not set');
    invariant(this.info.targetAsset != undefined, 'targetAsset not set');
    invariant(
      isNil(this.info.owner) || isValidSuiAddress(this.info.owner),
      'invalid owner'
    );
    invariant(
      isNil(this.info.receiver) || isValidSuiAddress(this.info.receiver),
      'invalid receiver'
    );
    parseStructTag(this.info.sourceAsset);
    parseStructTag(this.info.targetAsset);

    return new Plan({
      planId: this.info.planId ?? '1',
      subscriptionAmount: this.info.subscriptionAmount,
      subscriptionStartTime: this.info.subscriptionStartTime,
      subscriptionInterval: this.info.subscriptionInterval,
      executionCount: this.info.executionCount ?? 0,
      executionLimit: this.info.executionLimit,
      averagePrice: this.info.averagePrice,
      totalPurchasedAmount: this.info.totalPurchasedAmount,
      owner: this.info.owner,
      receiver: this.info.receiver,
      sourceAsset: this.info.sourceAsset,
      targetAsset: this.info.targetAsset,
      creationTime: this.info.creationTime ?? 0,
      status: this.info.status ?? PlanStatus.ONGOING,
    });
  }
}

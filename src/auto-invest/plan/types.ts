import { BigintIsh } from '../../core';

export enum PlanStatus {
  ONGOING = 'ONGOING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  REMOVED = 'REMOVED',
}

export enum SubscriptionCycle {
  MINUTE = 'MINUTE',
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export type PlanIdentifier = {
  planId: string;
};

export type PlanInfo = PlanIdentifier & {
  subscriptionAmount: BigintIsh;
  subscriptionStartTime?: number;
  subscriptionInterval: number;
  firstExecutionTime?: number;
  nextExecutionTime?: number;
  executionCount: number;
  executionLimit?: number;
  averagePrice?: string;
  totalPurchasedAmount?: string;
  owner?: string;
  receiver?: string;
  sourceAsset: string;
  targetAsset: string;
  creationTime?: number;
  status?: PlanStatus;
};

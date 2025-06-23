import { bcs } from '@mysten/sui/bcs';
import { TransactionResult } from '@mysten/sui/transactions';
import { Plan } from './plan';

export type WithdrawResult = {
  withdrawn: TransactionResult;
};

export type ExecutionPlanResult = {
  sourceCoin: {
    $kind: 'NestedResult';
    NestedResult: [number, number];
  };
  receipt: {
    $kind: 'NestedResult';
    NestedResult: [number, number];
  };
};

export const TypeNameBCS = bcs.struct('TypeName', {
  name: bcs.String,
});

export const PlanBCS = bcs.struct('Plan', {
  plan_id: bcs.U64,
  subscription_amount: bcs.U64,
  subscription_interval: bcs.U64,
  next_execution_time: bcs.U64,
  execution_count: bcs.U64,
  execution_limit: bcs.U64,
  average_price: bcs.U64,
  total_purchased_amount: bcs.U64,
  creation_time: bcs.U64,
  owner: bcs.Address,
  receiver: bcs.Address,
  source_asset: TypeNameBCS,
  target_asset: TypeNameBCS,
  paused: bcs.Bool,
});

export const QueryResultBCS = bcs.struct('QueryResult', {
  plans: bcs.vector(PlanBCS),
  cursor: bcs.option(bcs.U64),
  has_nex_page: bcs.Bool,
  total: bcs.U64,
});

export type PlanQueryFilter = {
  owner: string;
  cursor?: string;
  limit?: number;
  desc?: boolean;
};

export type QueryResult = {
  plans: Plan[];
  cursor?: string | null | undefined;
  hasNextPage: boolean;
  total: number;
};

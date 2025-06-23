export type MoveObject<T> = {
  fields: T;
  type: string;
};

export type ID = {
  id: string;
};

export type MoveTypeName = {
  name: string;
};

export type MoveInteger = {
  bits: number;
};

export type MoveTable = {
  id: ID;
  size: string;
};

export interface RewardInfo {
  ended_at_seconds: string;
  last_update_time: string;
  reward_coin_type: MoveObject<MoveTypeName>;
  reward_growth_global: string;
  reward_per_seconds: string;
  total_reward: string;
  total_reward_allocated: string;
}

export type PoolRawData = {
  id: ID;
  coin_type_x: MoveObject<MoveTypeName>;
  coin_type_y: MoveObject<MoveTypeName>;
  liquidity: string;
  reserve_x: string;
  reserve_y: string;
  sqrt_price: string;
  swap_fee_rate: string;
  tick_index: MoveObject<MoveInteger>;
  tick_spacing: number;
  fee_growth_global_x: string;
  fee_growth_global_y: string;
  reward_infos: MoveObject<RewardInfo>[];
  ticks: MoveObject<MoveTable>;
};

export type PositionRawData = {
  id: ID;
  liquidity: string;
  pool_id: string;
  tick_lower_index: MoveObject<MoveInteger>;
  tick_upper_index: MoveObject<MoveInteger>;
  coins_owed_x: string;
  coins_owed_y: string;
  fee_growth_inside_x_last: string;
  fee_growth_inside_y_last: string;
  reward_infos: MoveObject<PositionRewardInfo>[];
};

export type PositionRewardInfo = {
  coins_owed_reward: string;
  reward_growth_inside_last: string;
};

export type TickRawData = {
  fee_growth_outside_x: string;
  fee_growth_outside_y: string;
  liquidity_gross: string;
  liquidity_net: MoveObject<MoveInteger>;
  reward_growths_outside: string[];
  seconds_out_side: string;
  seconds_per_liquidity_out_side: string;
  tick_cumulative_out_side: MoveObject<MoveInteger>;
};

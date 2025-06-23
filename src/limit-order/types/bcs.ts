import { bcs } from '@mysten/sui/bcs';

export const TypeNameBCS = bcs.struct('TypeName', {
  name: bcs.String,
});

export const OrderBCS = bcs.struct('Order', {
  order_id: bcs.U64,
  client_order_id: bcs.U64,
  maker_asset: TypeNameBCS,
  taker_asset: TypeNameBCS,
  maker: bcs.Address,
  recipient: bcs.Address,
  allowed_taker: bcs.option(bcs.Address),
  making_amount: bcs.U64,
  remaining_amount: bcs.U64,
  taking_amount: bcs.U64,
  expires_timestamp: bcs.U64,
  allowed_partial_fills: bcs.Bool,
});

export const QueryResultBCS = bcs.struct('QueryResult', {
  orders: bcs.vector(OrderBCS),
  cursor: bcs.option(bcs.U64),
  total: bcs.U64,
});

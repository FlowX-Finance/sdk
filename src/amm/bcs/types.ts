import { bcs } from '@mysten/sui/bcs';
import { CoinBcs, CoinSupplyBcs, UID } from '../../core/bcs/types';

export const PoolMetadataBcs = bcs.struct('PoolMetadata', {
  id: UID,
  reserveX: CoinBcs,
  reserveY: CoinBcs,
  kLast: bcs.u128(),
  lpSupply: CoinSupplyBcs,
  feeRate: bcs.u64(),
});

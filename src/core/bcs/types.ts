import { bcs } from '@mysten/sui/bcs';
import { fromHEX, toHEX } from '@mysten/sui/utils';

export const UID = bcs.fixedArray(32, bcs.u8()).transform({
  input: (id: string) => fromHEX(id),
  output: (id) => toHEX(Uint8Array.from(id)),
});

export const CoinBcs = bcs.struct('Coin', {
  id: UID,
  value: bcs.u64(),
});

export const CoinSupplyBcs = bcs.struct('CoinSupply', {
  value: bcs.u64(),
});

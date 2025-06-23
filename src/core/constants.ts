import BN from 'bn.js';

// exports for external consumption
export type BigintIsh = BN | string | number;

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const ADDRESS_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export const SUI_PACKAGE_ID = '0x2';

export const STD_PACKAGE_ID = '0x1';

export const MODULE_OPTION = 'option';

export const ZERO = new BN(0);

export const ONE = new BN(1);

export const MaxUint64 = new BN('ffffffffffffffff', 16);

export const MaxUint256 = new BN(
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  16
);

export const DEFAULT_DECIMAL = 9;
export const Q64 = new BN(2).pow(new BN(64));
export const Q128 = new BN(2).pow(new BN(128));

export type NETWORK = 'mainnet' | 'testnet';

export const DEADLINE_TIME_SECONDS = 20 * 60; // minutes

export const MAX_OBJECTS_PER_QUERY = 50;

export const MAX_OBJECTS_DEV_INSPECT_PER_QUERY = 1000;

export const DEFAULT_CONCURRENCY = 10;

export const DEFAULT_CACHE_EXPIRATION_TIME_SECONDS = 120;

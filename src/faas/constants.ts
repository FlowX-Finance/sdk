import { BN } from 'bn.js';

export const STATE_MODULE = 'state';
export const MODULE_POOL_REGISTRY = 'pool_registry';
export const REWARD_PRECISION = new BN(1000000);

export const MAPPING_PACKAGE_ID = {
  testnet: '0xd219d9d3345eb2ec779e8c6faed9259f75e2aa879ea52da670366072fa5a46a7',
  mainnet: '0x943535499ac300765aa930072470e0b515cfd7eebcaa5c43762665eaad9cc6f2',
};

export const MAPPING_STATE_OBJECT_ID = {
  testnet: '0xfdc78b91296494f64fee04031e0615e496b1f92b9e7e68b328d159836eb8b1fb',
  mainnet: '0xe94c179dc1644206b5e05c75674b13118be74d4540baa80599a0cbbaad4fc39c',
};

export const MAPPING_POSITION_OBJECT_TYPE = {
  testnet:
    '0xd219d9d3345eb2ec779e8c6faed9259f75e2aa879ea52da670366072fa5a46a7::position::Position',
  mainnet:
    '0x943535499ac300765aa930072470e0b515cfd7eebcaa5c43762665eaad9cc6f2::position::Position',
};

export const MAPPING_POOL_REGISTRY_OBJECT_ID = {
  testnet: '0x189462a405393ed2ae6499647ba206590b3bf7ea152381812c2bd33e232a3451',
  mainnet: '0x5c38d069b2f208b0894078465a31b5beb425104894f3237195c90666a82753a2',
};

export const MAPPING_FLX_COIN_TYPE = {
  testnet: '',
  mainnet:
    '0x6dae8ca14311574fdfe555524ea48558e3d1360d1607d1c7f98af867e3b7976c::flx::FLX',
};

/**
 * The default enabled fee amounts, denominated in hundredths of bips.
 */
export enum FeeAmount {
  ZERO = 0,
  VERY_LOWEST = 10,
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

/**
 * The default tick spacings by fee amount.
 */
export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.ZERO]: 1,
  [FeeAmount.VERY_LOWEST]: 1,
  [FeeAmount.LOWEST]: 2,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

export const MODULE_POOL_MANAGER = 'pool_manager';
export const MODULE_POSITION_MANAGER = 'position_manager';
export const MODULE_I32 = 'i32';

export const BPS = 1e6;
export const I32_BITS = 32;
export const I128_BITS = 128;

export const CONFIGS = {
  mainnet: {
    packageId:
      '0xe882cd54551e73e64ff5b257146a0c5264546974cf00d78ecc871017cb22df67',
    poolRegistryObject:
      '0x27565d24a4cd51127ac90e4074a841bbe356cca7bf5759ddc14a975be1632abc',
    positionRegistryObject:
      '0x7dffe3229d675645564273aa68c67406b6a80aa29e245ac78283acd7ed5e4912',
    versionObject:
      '0x67624a1533b5aff5d0dfcf5e598684350efd38134d2d245f475524c03a64e656',
    positionType:
      '0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::position::Position',
    poolType:
      '0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::pool::Pool',
    i32Type:
      '0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::i32::I32',
    poolFeeCollectEventType:
      '0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::pool::Collect',
    poolRewardCollectEventType:
      '0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::pool::CollectPoolReward',
  },
  testnet: {
    packageId:
      '0x99c4e760b488a56b6be0f5e7afbf2e3640579e2cf7833bd703269b128ef54277',
    poolRegistryObject:
      '0xbc975b5ab2b3986a6bfbcb6d733d8ba98a774e0e1dd9b704a236c0810a33b3bf',
    positionRegistryObject:
      '0x7a8a99814eccd13a8b71b19631b8a659ffd6ab999508acae58ddc4eff64f5410',
    versionObject:
      '0x36a148eccf25b4126c53eb42686895aca7bb1faab0a70a5c98eab6d3cd63e9fc',
    poolFeeCollectEventType:
      '0x40aa5119ae0633e7ba3c80fe4fd3d9b5277300dead42f6f9e565e7dd589cf6cb::pool::Collect',
    positionType:
      '0x40aa5119ae0633e7ba3c80fe4fd3d9b5277300dead42f6f9e565e7dd589cf6cb::position::Position',
    poolType:
      '0x40aa5119ae0633e7ba3c80fe4fd3d9b5277300dead42f6f9e565e7dd589cf6cb::pool::Pool',
    i32Type:
      '0x40aa5119ae0633e7ba3c80fe4fd3d9b5277300dead42f6f9e565e7dd589cf6cb::i32::I32',
    poolRewardCollectEventType:
      '0x40aa5119ae0633e7ba3c80fe4fd3d9b5277300dead42f6f9e565e7dd589cf6cb::pool::CollectPoolReward',
  },
};

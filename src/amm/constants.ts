import { BN } from 'bn.js';

export const FACTORY_MODULE = 'factory';
export const MODULE_ROUTER = 'router';
export const BPS = 10000;
export const MINIMUM_LIQUIDITY = new BN(1000);

export const MAPPING_PACKAGE_ID = {
  testnet: '0xebebb67fc6fc6a74be5e57d90563c709631b4da86091c0926db81894add36ed3',
  mainnet: '0xba153169476e8c3114962261d1edc70de5ad9781b83cc617ecc8c1923191cae0',
};

export const MAPPING_CONTAINER_OBJECT_ID = {
  testnet: '0xcbca62dbd54d3a8545f27a298872b1af9363a82a04a329504b1f0fef0a5f9ce4',
  mainnet: '0xb65dcbf63fd3ad5d0ebfbf334780dc9f785eff38a4459e37ab08fa79576ee511',
};

export const AMM_BAG_PAIRS_PARENT_ID = {
  testnet: '',
  mainnet: '0xd15e209f5a250d6055c264975fee57ec09bf9d6acdda3b5f866f76023d1563e6',
};

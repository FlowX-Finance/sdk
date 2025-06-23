import { NETWORK } from '../core';

export interface IConfigs {
  containerObjectId: string;
  flowx: {
    packageId: string;
  };
}

const mainnet: IConfigs = {
  containerObjectId:
    '0xb65dcbf63fd3ad5d0ebfbf334780dc9f785eff38a4459e37ab08fa79576ee511',
  flowx: {
    packageId:
      '0xba153169476e8c3114962261d1edc70de5ad9781b83cc617ecc8c1923191cae0',
  },
};

const testnet: IConfigs = {
  containerObjectId:
    '0xcbca62dbd54d3a8545f27a298872b1af9363a82a04a329504b1f0fef0a5f9ce4',
  flowx: {
    packageId:
      '0xebebb67fc6fc6a74be5e57d90563c709631b4da86091c0926db81894add36ed3',
  },
};

export const getConfigs = (network: NETWORK): IConfigs =>
  ({ mainnet, testnet }[network]);

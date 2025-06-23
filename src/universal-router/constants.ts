import { BN } from 'bn.js';
import { Config } from './types';

export const MODULE_UNIVERSAL_ROUTER = 'universal_router';

export const MODULE_COMMISSION = 'commission';

export const MODULE_COMMISSION_TYPE = 'commission_type';

export enum Protocol {
  FLOWX_V2 = 'FLOWX',
  FLOWX_V3 = 'FLOWX_CLMM',
  KRIYA_DEX = 'KRIYA',
  TURBOS_FIANCE = 'TURBOS',
  CETUS = 'CETUS',
  AFTERMATH = 'AFTERMATH',
  DEEPBOOK = 'DEEPBOOK',
  KRIYA_V3 = 'KRIYA_CLMM',
  DEEPBOOK_V3 = 'DEEPBOOK_V3',
  BLUEMOVE = 'BLUEMOVE',
  BLUEFIN = 'BLUEFIN',
  FLOWX_PMM = 'FLOWX_PMM',
  BLUEMOVE_FUN = 'BLUEMOVE_FUN',
  HOP_FUN = 'HOP_FUN',
  SEVEN_K_FUN = '7K_FUN',
  TURBOS_FUN = 'TURBOS_FUN',
  OBRIC = 'OBRIC',
  HAEDAL_PMM = 'HAEDAL_PMM',
  HAEDAL = 'HAEDAL',
  SPRING_SUI = 'SPRING_SUI',
  ALPHA_FI = 'ALPHA_FI',
  VOLO_LSD = 'VOLO_LSD',
  AFTERMATH_LSD = 'AFTERMATH_LSD',
  STEAMM = 'STEAMM',
  METASTABLE = 'METASTABLE',
  MAGMA_FINANCE = 'MAGMA_FINANCE',
  MOMENTUM_FINANCE = 'MOMENTUM_FINANCE',
}

export enum CommissionType {
  PERCENTAGE,
  FLAT,
}

export const BPS = new BN(1_000_000);

export const CONFIGS: { [key: string]: Config } = {
  mainnet: {
    packageId:
      '0xc263060d3cbb4155057f0010f92f63ca56d5121c298d01f7a33607342ec299b0',
    packageIdOld:
      '0xc263060d3cbb4155057f0010f92f63ca56d5121c298d01f7a33607342ec299b0',
    treasuryObjectId:
      '0x25db8128dc9ccbe5fcd15e5700fea555c6b111a8c8a1f20c426b696caac2bea4',
    tradeIdTrackerObjectId:
      '0x9ab469842f85fd2a1bac9ba695d867adb1caa7d5705809737922b5cee552eb6f',
    partnerRegistryObjectId:
      '0x29e6c1c2176485dc045a2e39eb8844b4ca1cf8452d964447c11202f84a76cb1a',
    versionedObjectId:
      '0xada98dd9e028db64e206dd81fdecb3dbc8b4c16be08d9f175550032bfdcf56f3',
    partnerCommissionCollectEvent:
      '0xc263060d3cbb4155057f0010f92f63ca56d5121c298d01f7a33607342ec299b0::partner_manager::Collect',
    quoter: {
      singleQuoteURI: 'https://api.flowx.finance/flowx-ag-routing/api/v1/quote',
      batchQuoteURI:
        'https://api.flowx.finance/flowx-ag-routing/api/v1/batch-quotes',
      requestTimeout: 30000,
    },
    graphql: {
      baseURI: 'https://api.flowx.finance/flowx-be/graphql',
    },
    pyth: {
      priceServiceEndpoint: 'https://hermes.pyth.network/v2',
      stateObjectId:
        '0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8',
    },
    wormhole: {
      stateObjectId:
        '0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c',
    },
  },
  testnet: {
    packageIdOld:
      '0xf055dc4f52856906c31aade424cbdd2a9aae827b4ea1fe7b9eb904d70e34ae60',
    packageId:
      '0xf055dc4f52856906c31aade424cbdd2a9aae827b4ea1fe7b9eb904d70e34ae60',
    treasuryObjectId:
      '0xfe423684ac5de04438a0f11e84e085ada4cf961c861ac65720b30a9c2e5c1c55',
    tradeIdTrackerObjectId:
      '0xa42c1eee22693aebe12c226519a958293c4a9b679e0dae84a8c37ed9709688e5',
    partnerRegistryObjectId:
      '0x8e7a2955e3898c296bf7b95dfef0b4d0c693e1018a6ef68ea9dc0ea1f2c6087f',
    partnerCommissionCollectEvent:
      '0xf055dc4f52856906c31aade424cbdd2a9aae827b4ea1fe7b9eb904d70e34ae60::partner_manager::Collect',
    versionedObjectId:
      '0x458a5128e93435f50e09d035ef7437f04dd8b931ca5ec7818d1b6b5c36a1bf79',
    quoter: {
      singleQuoteURI:
        'https://flowx-dev.flowx.finance/flowx-ag-routing/api/v1/quote',
      batchQuoteURI:
        'https://flowx-dev.flowx.finance/flowx-ag-routing/api/v1/batch-quotes',
      requestTimeout: 30000,
    },
    graphql: {
      baseURI: 'https://flowx-dev.flowx.finance/flowx-be/graphql',
    },
    pyth: {
      priceServiceEndpoint: '',
      stateObjectId: '',
    },
    wormhole: {
      stateObjectId: '',
    },
  },
};

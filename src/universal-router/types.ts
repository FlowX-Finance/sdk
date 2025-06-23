export enum SteammQuoterType {
  CONSTANT_PRODUCT = 'constant_product',
  ORACLE = 'oracle',
  ORACLE_V2 = 'oracle_v2',
}

export enum OracleType {
  PYTH = 'pyth',
  SWITCHBOARD = 'switchboard',
}

export interface Config {
  packageId: string;
  packageIdOld: string;
  partnerCommissionCollectEvent: string;
  treasuryObjectId: string;
  tradeIdTrackerObjectId: string;
  partnerRegistryObjectId: string;
  versionedObjectId: string;
  quoter: QuoterConfig;
  graphql: GraphqlConfig;
  pyth: PythConfig;
  wormhole: WormholeConfig;
}

export type PythConfig = {
  priceServiceEndpoint: string;
  stateObjectId: string;
};

export type WormholeConfig = {
  stateObjectId: string;
};

interface GraphqlConfig {
  baseURI: string;
}

interface QuoterConfig {
  singleQuoteURI: string;
  batchQuoteURI: string;
  requestTimeout: number;
}

export type OracleInfo = {
  oracleType: OracleType;
  oracleIndex?: number;
  priceId: string;
};

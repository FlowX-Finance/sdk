import { gql } from 'graphql-request';

export const queryCoins = gql`
  query QueryCoins(
    $size: Int
    $page: Int
    $isVerified: Boolean
    $coinTypes: [String!]
    $sortBy: String
    $sortDirection: SortDirection
    $searchKey: String
  ) {
    queryCoins(
      size: $size
      page: $page
      isVerified: $isVerified
      coinTypes: $coinTypes
      sortBy: $sortBy
      sortDirection: $sortDirection
      searchKey: $searchKey
    ) {
      page
      size
      total
      items {
        _id
        name
        symbol
        type
        decimals
        iconUrl
        description
        explorerUrl
        derivedSUI
        derivedSUIV3
        derivedPriceInUSD
        totalVolume
        totalVolumeV3
        totalVolumeInUSD
        totalVolumeInUSDV3
        totalLiquidity
        totalLiquidityV3
        txCount
        isVerified
        twitterUrl
        websiteUrl
        coinMarketcapUrl
        coingeckoUrl
      }
    }
  }
`;

export const multiGetCoins = gql`
  query MultiGetCoins($coinTypes: [String!]!) {
    multiGetCoins(coinTypes: $coinTypes) {
      markets {
        price
      }
      name
      iconUrl
      decimals
      description
      type
      symbol
      isVerified
    }
  }
`;

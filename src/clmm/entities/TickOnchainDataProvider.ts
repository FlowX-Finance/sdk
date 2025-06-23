import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { Tick } from './Tick';
import { TickDataProvider } from './TickDataProvider';
import { CONFIGS, I128_BITS, I32_BITS } from '../constants';
import { NETWORK } from '../../core';
import invariant from 'tiny-invariant';
import { TickRawData } from '../types';

interface TickOnchainDataProviderConstructorArgs {
  network: NETWORK;
  tickManagerId: string;
}

/**
 * A data provider for ticks that is backed by by onchain queries.
 */
export class TickOnchainDataProvider implements TickDataProvider {
  public readonly network: NETWORK;
  private readonly tickManagerId: string;
  private readonly client: SuiClient;

  constructor({
    network,
    tickManagerId,
  }: TickOnchainDataProviderConstructorArgs) {
    this.network = network;
    this.tickManagerId = tickManagerId;
    this.client = new SuiClient({
      url: getFullnodeUrl(network),
    });
  }

  async getTick(index: number): Promise<Tick> {
    const tickObject: any = await this.client.getDynamicFieldObject({
      parentId: this.tickManagerId,
      name: {
        type: `${CONFIGS[this.network].i32Type}`,
        value: {
          bits: BigInt.asUintN(I32_BITS, BigInt(index)).toString(),
        },
      },
    });
    invariant(tickObject.data, 'tick not found');

    const rawData = tickObject.data?.content?.['fields'].value
      .fields as TickRawData;

    return new Tick({
      index,
      liquidityNet: BigInt.asIntN(
        I128_BITS,
        BigInt(rawData.liquidity_net.fields.bits)
      ).toString(),
      liquidityGross: rawData.liquidity_gross,
      feeGrowthOutsideX: rawData.fee_growth_outside_x,
      feeGrowthOutsideY: rawData.fee_growth_outside_y,
      rewardGrowthsOutside: rawData.reward_growths_outside,
    });
  }
}

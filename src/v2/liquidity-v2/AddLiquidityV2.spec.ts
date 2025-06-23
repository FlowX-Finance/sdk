import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { AddLiquidityV2 } from './AddLiquidityV2';

describe('AddLiquidityV2', () => {
  const network = 'mainnet';
  const suiClient = new SuiClient({
    url: getFullnodeUrl(network),
  });

  const addLiquidityV2 = new AddLiquidityV2(network, suiClient);
  const sender = `0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c`;

  it('buildTransaction should work', async () => {
    const tx = await addLiquidityV2.buildTransaction(
      {
        x: '0x2::sui::SUI',
        y: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      },
      {
        x: '1000000000',
        y: '1000000',
      },
      sender,
      1
    );

    const resp = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });

    expect(resp.effects.status.status === 'success').toBeTruthy();
  });
});

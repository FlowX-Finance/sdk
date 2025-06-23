import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { SUI_TYPE_ARG } from '@mysten/sui/utils';

import { Coin } from '../core';
import { PartnerManager } from './PartnerManager';

describe('#PartnerManager', () => {
  const client = new SuiClient({
    url: getFullnodeUrl('mainnet'),
  });
  const partnerManager = new PartnerManager({ network: 'mainnet', client });
  const ADDRESS =
    '0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c';

  it('should get commission amounts correctly', async () => {
    {
      const commissionAmounts = await partnerManager.getCommissionAmounts({
        address: ADDRESS,
      });
      expect(
        commissionAmounts
          .map((commissionAmount) => commissionAmount.quotient.toNumber())
          .sort()
      ).toEqual([2012, 3487296]);
    }

    {
      const commissionAmounts = await partnerManager.getCommissionAmounts({
        address: ADDRESS,
        coins: [new Coin(SUI_TYPE_ARG)],
      });
      expect(commissionAmounts.length).toEqual(1);
      expect(commissionAmounts[0].quotient.toNumber()).toEqual(3487296);
    }
  });

  it('should withdraw commissions correctly', async () => {
    const tx = await partnerManager.withdrawCommissions({
      address: ADDRESS,
      recipient: ADDRESS,
    })();

    const resp = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: ADDRESS,
    });
    expect(resp.effects.status.status === 'success').toBeTruthy();

    const withdrawAmounts = resp.events.map((event) =>
      Number((event.parsedJson as any).amount)
    );
    expect(withdrawAmounts.sort()).toEqual([2012, 3487296]);
  });
});

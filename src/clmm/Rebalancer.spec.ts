import BN from 'bn.js';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { Rebalancer } from './Rebalancer';
import { ClmmPoolManager } from './ClmmPoolManager';
import { ClmmPositionManager } from './ClmmPositionManager';
import { Percent } from '../core';
import { ClmmTickMath } from './utils';

describe('#Rebalancer', () => {
  const client = new SuiClient({
    url: getFullnodeUrl('mainnet'),
  });
  const rebalancer = new Rebalancer({
    network: 'mainnet',
  });
  const poolManager = new ClmmPoolManager('mainnet');
  const positionManager = new ClmmPositionManager('mainnet', poolManager);

  it('rebalance active range work correctly', async () => {
    const position = await positionManager.getPosition(
      '0x090184bdb2ac9ba008436a21d9f8ff94d673225badb25fabf60fb8ee0432c725'
    );

    const fivePercent = new Percent(5, 100);
    const tickLower = ClmmTickMath.getInitializableTickIndex(
      ClmmTickMath.sqrtPriceX64ToTickIndex(
        new BN(
          new Percent(1)
            .subtract(fivePercent)
            .asFraction.multiply(position.pool.sqrtPriceX64)
            .toFixed(0)
        )
      ),
      position.pool.tickSpacing
    );

    const tickUpper = ClmmTickMath.getInitializableTickIndex(
      ClmmTickMath.sqrtPriceX64ToTickIndex(
        new BN(
          new Percent(1)
            .add(fivePercent)
            .asFraction.multiply(position.pool.sqrtPriceX64)
            .toFixed(0)
        )
      ),
      position.pool.tickSpacing
    );

    const tx = new Transaction();
    const newPosition = await rebalancer.rebalance(
      position,
      tickLower,
      tickUpper,
      {
        slippageTolerance: 1000,
        priceImpactPercentThreshold: -5000,
        minZapAmounts: {
          amountX: 1000,
          amountY: 1000,
        },
      }
    )(tx);
    tx.transferObjects([newPosition], position.owner);
    const res = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: position.owner,
    });
    expect(res.effects.status.status === 'success').toBeTruthy();
    console.dir(res.events, { depth: 100 });
  }, 10000);

  it('rebalance inactive range work correctly', async () => {
    const position = await positionManager.getPosition(
      '0x090184bdb2ac9ba008436a21d9f8ff94d673225badb25fabf60fb8ee0432c725'
    );

    const fivePercent = new Percent(5, 100);

    // out to left active tick
    {
      const tickLower = ClmmTickMath.getInitializableTickIndex(
        ClmmTickMath.sqrtPriceX64ToTickIndex(
          new BN(
            new Percent(1)
              .subtract(fivePercent)
              .asFraction.multiply(position.pool.sqrtPriceX64)
              .toFixed(0)
          )
        ),
        position.pool.tickSpacing
      );

      const tx = new Transaction();
      const newPosition = await rebalancer.rebalance(
        position,
        tickLower,
        ClmmTickMath.getInitializableTickIndex(
          position.pool.tickCurrent,
          position.pool.tickSpacing
        ),
        {
          slippageTolerance: 1000,
          priceImpactPercentThreshold: -5000,
          minZapAmounts: {
            amountX: 1000,
            amountY: 1000,
          },
        }
      )(tx);
      tx.transferObjects([newPosition], position.owner);
      const res = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: position.owner,
      });
      expect(res.effects.status.status === 'success').toBeTruthy();
    }

    // out to right active tick
    {
      const tickUpper = ClmmTickMath.getInitializableTickIndex(
        ClmmTickMath.sqrtPriceX64ToTickIndex(
          new BN(
            new Percent(1)
              .add(fivePercent)
              .asFraction.multiply(position.pool.sqrtPriceX64)
              .toFixed(0)
          )
        ),
        position.pool.tickSpacing
      );

      const tx = new Transaction();
      const newPosition = await rebalancer.rebalance(
        position,
        ClmmTickMath.getInitializableTickIndex(
          position.pool.tickCurrent,
          position.pool.tickSpacing
        ) + position.pool.tickSpacing,
        tickUpper,
        {
          slippageTolerance: 1000,
          priceImpactPercentThreshold: -5000,
          minZapAmounts: {
            amountX: 1000,
            amountY: 1000,
          },
        }
      )(tx);
      tx.transferObjects([newPosition], position.owner);
      const res = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: position.owner,
      });
      expect(res.effects.status.status === 'success').toBeTruthy();
    }
  }, 10000);
});

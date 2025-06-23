import { BN } from 'bn.js';
import { SUI_TYPE_ARG } from '@mysten/sui/utils';

import { TradeBuilder } from './TradeBuilder'; //
import { Coin, ONE, sumBn } from '../../core';
import { Trade } from '../entities';
import { randomBytes } from 'crypto';
import { BPS } from '../constants';

jest.mock('../entities/Commission');
jest.mock('../entities/Route');

const USDC_TYPE =
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

// Sample route data
const mockRoute: any = {
  input: new Coin(SUI_TYPE_ARG),
  output: new Coin(USDC_TYPE),
  amountIn: '1000',
  amountOut: '500',
};

const randomHex = (bytes = 32) => {
  return '0x' + randomBytes(bytes).toString('hex');
};

describe('#TradeBuilder', () => {
  let builder: TradeBuilder<any, any>;

  beforeEach(() => {
    // Setting up the initial TradeBuilder instance with sample data
    builder = new TradeBuilder('testnet', [mockRoute, mockRoute]);
  });

  it('should correctly instantiate TradeBuilder', () => {
    expect(builder).toBeInstanceOf(TradeBuilder);
    expect(builder['_network']).toBe('testnet');
    expect(builder['_routes']).toEqual([mockRoute, mockRoute]);
    expect(builder['_amountIn']).toEqual(
      sumBn([new BN(mockRoute.amountIn), new BN(mockRoute.amountIn)])
    );
  });

  it('should set sender correctly', () => {
    const sender = randomHex();
    builder.sender(sender);
    expect(builder['_sender']).toBe(sender);
    expect(builder.build()).toBeInstanceOf(Trade);
  });

  it('should set recipient correctly', () => {
    const recipient = randomHex();
    builder.recipient(recipient);
    expect(builder['_recipient']).toBe(recipient);
    expect(builder.build()).toBeInstanceOf(Trade);
  });

  it('should set amountIn correctly', () => {
    builder.amountIn('1500');
    expect(builder['_amountIn']).toBe('1500');
    expect(builder.build()).toBeInstanceOf(Trade);
  });

  it('should set deadline correctly', () => {
    builder.deadline(1234567890);
    expect(builder['_deadline']).toBe(1234567890);
    expect(builder.build()).toBeInstanceOf(Trade);
  });

  it('should set slippage correctly', () => {
    builder.slippage(100);
    expect(builder['_slippage']).toBe(100);
    expect(builder.build()).toBeInstanceOf(Trade);
  });

  it('should correctly set commission', () => {
    {
      const mockCommission: any = {
        coin: mockRoute.input,
        computeCommissionAmount: jest.fn(() => new BN(10)),
      };
      builder.commission(mockCommission);
      expect(builder['_commission']).toBe(mockCommission);
      expect(builder.build()).toBeInstanceOf(Trade);
    }

    {
      const mockCommission: any = {
        coin: mockRoute.output,
        computeCommissionAmount: jest.fn(() => new BN(10)),
      };
      builder.commission(mockCommission);
      expect(builder['_commission']).toBe(mockCommission);
      expect(builder.build()).toBeInstanceOf(Trade);
    }
  });

  it('should throw error if commission coin is invalid', () => {
    const invalidCommission: any = {
      coin: new Coin(
        '0x6dae8ca14311574fdfe555524ea48558e3d1360d1607d1c7f98af867e3b7976c::flx::FLX'
      ),
      computeCommissionAmount: jest.fn(() => new BN(10)),
    };
    builder.commission(invalidCommission);
    expect(() => builder.build()).toThrow('INVALID_COMMISSION');
  });

  it('should build a Trade object correctly', () => {
    const mockTrade = builder.build();
    expect(mockTrade).toBeInstanceOf(Trade);
    expect(mockTrade.network).toBe('testnet');
    expect(mockTrade.amountIn.toString()).toBe(builder['_amountIn'].toString());
    expect(mockTrade.amountOut.toString()).toBe(
      builder['_amountOut'].toString()
    );
    expect(mockTrade.routes).toEqual(builder['_routes']);
  });

  it('should throw error when amountIn is invalid', () => {
    builder.amountIn('0');
    expect(() => builder.build()).toThrow('AMOUNT_IN');
  });

  it('should throw error when amountOut is invalid', () => {
    builder.amountOut('0');
    expect(() => builder.build()).toThrow('AMOUNT_OUT');
  });

  it('should throw error when slippage is greater than BPS', () => {
    builder.slippage(BPS.add(ONE).toNumber()); // Assuming BPS is 10000
    expect(() => builder.build()).toThrow('SLIPPAGE');
  });

  it('should throw error when sender or recipient address is invalid', () => {
    const invalid_address = randomHex(24);
    builder.sender(invalid_address);
    builder.recipient(randomHex());
    expect(() => builder.build()).toThrow('ADDRESSEES');
  });
});

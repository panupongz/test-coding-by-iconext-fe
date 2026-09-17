import { CreateSaleResponse } from '../../../core/models/sale-api.models';
import { ActiveSaleViewModel } from '../models/pos.models';
import { mapSaleToActiveSale } from './sale.mapper';

describe('mapSaleToActiveSale', () => {
  it('maps a create-sale API response to the active-sale view model', () => {
    const response: CreateSaleResponse = {
      sale_id: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
      product_code: 'P001',
      name: 'Iced Americano',
      unit_price: 60,
      quantity: 1,
      total: 60,
      status: 'PENDING',
      created_at: '2026-09-17T00:00:00.000Z',
      expires_at: '2026-09-17T00:05:00.000Z'
    };
    const expected: ActiveSaleViewModel = {
      saleId: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
      productCode: 'P001',
      productName: 'Iced Americano',
      unitPrice: 60,
      quantity: 1,
      total: 60,
      status: 'PENDING',
      createdAt: '2026-09-17T00:00:00.000Z',
      expiresAt: '2026-09-17T00:05:00.000Z'
    };

    expect(mapSaleToActiveSale(response)).toEqual(expected);
  });
});

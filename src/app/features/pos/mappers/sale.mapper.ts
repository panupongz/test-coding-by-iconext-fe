import { CreateSaleResponse } from '../../../core/models/sale-api.models';
import { ActiveSaleViewModel } from '../models/pos.models';

export const mapSaleToActiveSale = (
  response: CreateSaleResponse
): ActiveSaleViewModel => ({
  saleId: response.sale_id,
  productCode: response.product_code,
  productName: response.name,
  unitPrice: response.unit_price,
  quantity: response.quantity,
  total: response.total,
  status: response.status,
  createdAt: response.created_at,
  expiresAt: response.expires_at
});

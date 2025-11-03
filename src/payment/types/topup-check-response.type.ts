export interface ITopupCheckResponse {
  status: boolean;
  sbp_uuid: string;
  qr_url: string;
  sbp_url: string;
  product: string;
  product_id: number;
  merchant_price_rub: number;
  retail_price_rub: number;
}

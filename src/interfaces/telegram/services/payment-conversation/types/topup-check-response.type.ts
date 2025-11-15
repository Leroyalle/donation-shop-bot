export type TTopupCheckResponse = ITopupCheckSuccess | ITopupCheckError;

interface ITopupCheckSuccess {
  status: true;
  sbp_uuid: string;
  qr_url: string;
  sbp_url: string;
  product: string;
  product_id: number;
  merchant_price_rub: number;
  retail_price_rub: number;
}

interface ITopupCheckError {
  status: false;
  comment: string;
}

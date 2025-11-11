export interface ITopupCheckRequest {
  account: string;
  password: string;
  nickname: string;
  backupcode?: string;
  region: string;
  retail_price?: number;
  product_id: string;
  success_url?: string;
  order_id?: string;
}

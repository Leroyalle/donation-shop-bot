export interface ITopupCheckRequest {
  // account: string;
  // password: string;
  // nickname: string;
  // backupcode?: string;
  // region: string;
  retail_price: number;
  product_id: number | string;
  success_url?: string;
  order_id?: string;
}

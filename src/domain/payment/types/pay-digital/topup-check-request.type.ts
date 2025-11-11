export interface ITopupCheckRequest {
  account: string;
  password: string;
  nickname: string;
  backupcode?: string;
  region: string;
  product_id: string;
  success_url?: string;
  order_id?: string;
}

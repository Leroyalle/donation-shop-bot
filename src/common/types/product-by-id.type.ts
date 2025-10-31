import { TProductType } from './product-type.type';

export interface IProductById {
  product_id: number;
  name: string;
  price: number;
  in_stock: true;
  type: TProductType;
  group: string;
  region: string;
}

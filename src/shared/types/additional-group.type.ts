import { TProductType } from './product-type.type';

export type Option = {
  name?: string;
  value: string | number;
  product?: string;
  price: number;
  region?: string;
  name_prefix?: string;
  type?: TProductType;
};

export type Field = {
  name: string;
  type: 'text' | 'options';
  label?: string;
  options?: Option[];
};

export type Forms = {
  topup_fields: Field[];
  voucher_fields: Field[];
};

export type AdditionalGroup = {
  image: string;
  icon: string;
  group: string;
  category: string;
  short_info: string;
  forms?: Forms;
};

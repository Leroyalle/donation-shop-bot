import { Option } from 'src/shared/types/additional-group.type';

export const getOptionText = (o: Option) => {
  return (
    o.product ??
    o.name ??
    o.name_prefix ??
    o.value?.toString() ??
    o.price?.toString() ??
    ''
  );
};

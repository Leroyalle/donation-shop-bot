import { bannedProducts } from '../constants/banned-products';

export const checkProductsIsBanned = (name: string): string | undefined => {
  return bannedProducts.find(
    (g) => normalizeProductName(g) === normalizeProductName(name),
  );
};

const normalizeProductName = (name: string) => {
  return name.split(' ').join('').toLowerCase();
};

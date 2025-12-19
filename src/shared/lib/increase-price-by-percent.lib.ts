export const increasePriceByPercent = (
  price: number,
  incPercent: number = 8,
) => {
  return Math.round(price * (1 + incPercent / 100));
};

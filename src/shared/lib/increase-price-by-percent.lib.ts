export const increasePriceByPercent = (
  price: number,
  incPercent: number = 10,
) => {
  return Math.round(price * (1 + incPercent / 100));
};

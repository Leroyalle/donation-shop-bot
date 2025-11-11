export const increasePriceByPercent = (
  price: number,
  incPercent: number = 10,
) => {
  return Math.floor(price * (1 + incPercent / 100));
};

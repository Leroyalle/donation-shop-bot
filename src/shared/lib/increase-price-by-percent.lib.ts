export const increasePriceByPercent = (
  price: number,
  incPercent: number = 15,
) => {
  return Math.floor(price * (1 + incPercent / 100));
};

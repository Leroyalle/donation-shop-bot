export const increasePriceByPercent = (
  price: number,
  incPercent: number = 10,
) => {
  return price * (1 + incPercent / 100);
};

export const TELEGRAM_API_URL = 'https://api.telegram.org';
export const CKASSA_PAYMENT_URL = 'https://api2.ckassa.ru/api-shop/rs/open';
export enum PAY_DIGITAL_PAYMENT_URL {
  steam = 'https://foreign.foreignpay.ru',
  v2 = 'https://keys.foreignpay.ru/webhook/v2/merchant',
}

export const CKASSA_PAYMENT_ENDPOINTS = {
  invoice: `${CKASSA_PAYMENT_URL}/invoice/create2`,
};

export const PAY_DIGITAL_PAYMENT_ENDPOINTS = {
  getAllProducts: `${PAY_DIGITAL_PAYMENT_URL.v2}/get-products`,
  getGroups: `${PAY_DIGITAL_PAYMENT_URL.v2}/get-groups`,
  getProductsByGroup: `${PAY_DIGITAL_PAYMENT_URL.v2}/get-group-form`,
  getProduct: `${PAY_DIGITAL_PAYMENT_URL.v2}/get-product`,
  topupCheck: `${PAY_DIGITAL_PAYMENT_URL.v2}/topup/check`,
  steamCheck: `${PAY_DIGITAL_PAYMENT_URL.steam}/steam/check`,
  steamPay: `${PAY_DIGITAL_PAYMENT_URL.steam}/steam/pay`,
};

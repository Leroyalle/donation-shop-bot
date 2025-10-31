export const TELEGRAM_API_URL = 'https://api.telegram.org';
export const CKASSA_PAYMENT_URL = 'https://demo-api2.ckassa.ru/api-shop/rs/bot';
export const PAY_DIGITAL_PAYMENT_URL =
  'https://keys.foreignpay.ru/webhook/v2/merchant';

export const CKASSA_PAYMENT_ENDPOINTS = {
  invoice: `${CKASSA_PAYMENT_URL}/invoice/create2`,
};

export const PAY_DIGITAL_PAYMENT_ENDPOINTS = {
  getAllProducts: `${PAY_DIGITAL_PAYMENT_URL}/get-products`,
  getGroups: `${PAY_DIGITAL_PAYMENT_URL}/get-groups`,
  getProductsByGroup: `${PAY_DIGITAL_PAYMENT_URL}/get-group-form`,
  getProduct: `${PAY_DIGITAL_PAYMENT_URL}/get-product`,
};

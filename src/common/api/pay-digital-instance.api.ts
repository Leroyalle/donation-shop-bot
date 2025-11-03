import axios from 'axios';
import { PAY_DIGITAL_PAYMENT_URL } from '../constants/api-paths';

// export const payDigitalInstance = axios.create({
//   baseURL: PAY_DIGITAL_PAYMENT_URL,
//   headers: {
//     Authorization: `Bearer ${process.env.PAYDIGITAL_TOKEN}`,
//   },
// });

export const payDigitalInstance = axios.create({
  baseURL: 'https://paydigital/api',
});

payDigitalInstance.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${process.env.PAYDIGITAL_TOKEN}`;
  return config;
});

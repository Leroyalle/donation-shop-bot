import { OrderType } from 'src/domain/order/types/order-type.type';

export const orderTypeManager: Record<OrderType, string> = {
  BUY_KEY: 'Покупка ключа',
  EXTEND_KEY: 'Продление ключа',
  CARD: 'Покупка корзины (см. содержимое)',
  STARS: 'Покупка корзины (см. содержимое)',
  STEAM: 'Пополнение Steam',
  TOPUP: 'Пополнение аккаунта TOPUP',
  VOUCHER: 'Пополнение аккаунта VOUCHER',
};

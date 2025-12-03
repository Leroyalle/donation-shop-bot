export class IntellectMoneyWebhookDto {
  /** Номер магазина */
  // @IsNumber()
  eshopId: number; // INT, required

  /** Номер СКО (3xxxxxxxxx) */
  // @IsString()
  paymentId: number; // LONG, required

  /** Внутренний номер покупки */
  // @IsString()
  orderId: string; // STRING, required, max 50

  /** Номер счёта магазина */
  // @IsString()
  eshopAccount: number; // LONG, required

  /** Назначение платежа (описание товара/услуги) */
  serviceName?: string; // STRING, optional, max 1024

  /** Исходная сумма платежа */
  recipientOriginalAmount: number; // DECIMAL, required

  /** Сумма платежа */
  recipientAmount: number; // DECIMAL, required

  /** Сумма возврата */
  refundAmount?: number; // DECIMAL, optional

  /** Валюта платежа */
  recipientCurrency: RecipientCurrency; // STRING, required

  /** Статус платежа */
  paymentStatus: PaymentStatus; // INT, required

  /** Имя покупателя */
  userName?: string; // STRING, optional, max 255

  /** Email покупателя */
  userEmail: string; // STRING, required

  /** Дата последнего события (yyyy-MM-dd HH:mm:ss) */
  paymentData: string; // STRING, required

  /** Способ оплаты */
  payMethod?: PayMethod; // STRING, optional

  /** Короткий PAN */
  shortPan?: string; // STRING, optional, max 22

  /** Страна карты (ISO 3166-1 alpha-3) */
  country?: string; // STRING, optional, max 3

  /** Банк-эмитент */
  bank?: string; // STRING, optional, max 100

  /** IPv4 адрес пользователя */
  ipAddress?: string; // STRING, optional, max 15

  /** Секретный ключ (если передаётся) */
  secretKey?: string; // STRING, optional

  /** Название шлюза */
  gatewayName?: string; // STRING, optional, max 50

  /**
   * Статус операции по расписанию (recurring)
   * Передаётся только для операций по расписанию
   */
  recurringState?: RecurringState; // STRING, conditional

  /**
   * Исходный СКО
   * Передаётся только для операций по расписанию
   */
  sourceInvoiceId?: number; // LONG, conditional

  /** Контрольная подпись */
  hash: string; // STRING, required
}

/* =========================
      ENUMS / CONSTANTS
   ========================= */

export type RecipientCurrency = 'RUB' | 'RUR' | 'TST' | 'USD' | 'EUR';

export enum PaymentStatus {
  Created = 3, // создан
  Canceled = 4, // отменён
  Paid = 5, // оплачен
  Hold = 6, // захолдирован
  PartiallyPaid = 7, // частично оплачен
  Refunded = 8, // возврат
}

export type PayMethod =
  | 'Acquiring'
  | 'TestAcquiring'
  | 'PremiumCardAcquiring'
  | 'ForeignAcquiring'
  | 'BNPL'
  | 'Sbp'
  | 'MirPay'
  | 'SberPay'
  | 'YandexPay'
  | 'GazpromPay'
  | 'QiwiWallet';

export type RecurringState = 'Activated';

import { PaymentRequest } from '../types/payment-request-data.type';
import * as crypto from 'crypto';

export const generatePaymentToken = (
  data: PaymentRequest,
  secretKey: string,
): PaymentRequest => {
  const valuesInOrder = [
    String(data.Amount),
    data.Description,
    data.OrderId,
    secretKey,
    data.TerminalKey,
  ];

  const stringToHash = valuesInOrder.join('');

  const hash = crypto
    .createHash('sha256')
    .update(stringToHash, 'utf8')
    .digest('hex');

  data.Token = hash;

  return data;
};

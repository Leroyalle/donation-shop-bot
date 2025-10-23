export type PaymentWebhookData = {
  regPayNum: number;
  amount: number;
  state: string;
  result: {
    code: number;
    message: string;
    details: unknown;
  };
  property: {
    orderId: string;
  };
};

export type PaymentStatus = 'NEW' | 'CONFIRMED' | 'REJECTED';

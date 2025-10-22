export type TinkoffWebhookData = {
  Success: boolean;
  Status: PaymentStatus;
  OrderId: string;
  PaymentId: string;
  DATA: {
    userId: string;
    amount: number;
    [key: string]: any;
  };
};

export type PaymentStatus = 'NEW' | 'CONFIRMED' | 'REJECTED';

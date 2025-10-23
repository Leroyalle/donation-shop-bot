export type PaymentWebhookData = {
  regPayNum: number;
  property: {
    orderId: string;
  };
  rrn: number;
  irn: number;
  approvalCode: number;
  cardPan: number;
  amount: number;
  state: 'PAYED';
  result: {
    code: string;
    message: string | null;
    details: any;
  };
  created: '20-06-2023 17:56:36';
};

export type PaymentStatus = 'NEW' | 'CONFIRMED' | 'REJECTED';

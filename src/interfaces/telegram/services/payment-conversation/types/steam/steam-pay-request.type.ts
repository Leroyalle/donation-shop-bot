export interface ISteamPayRequest {
  steamUsername: string;
  amount: number;
  netAmount: number;
  currency: 'RUB';
  transactionId: string;
  successUrl?: string;
  orderId: string;
  directSuccess: boolean;
}

export interface ISteamCheckResult {
  status: 'success' | 'error';
  message: 'Аккаунт Steam успешно найден';
  steamUsername: string;
  transactionId: string;
}

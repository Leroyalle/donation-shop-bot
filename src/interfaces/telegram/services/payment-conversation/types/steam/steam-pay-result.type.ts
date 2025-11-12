export type TSteamPayResult = TSteamPayError | TSteamPaySuccess;

type TSteamPayError = {
  status: 'error';
  message: string;
};

type TSteamPaySuccess = {
  status?: 'success';
  payUrl: string;
  sbpTransactionUuid: string;
};

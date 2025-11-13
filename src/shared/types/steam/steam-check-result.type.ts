export type TSteamCheckResult = TSteamCheckError | TSteamCheckSuccess;

type TSteamCheckError = {
  status: 'error';
  message: string;
};

type TSteamCheckSuccess = {
  status: 'success';
  message: string;
  steamUsername: string;
  transactionId: string;
};

export type TSteamCheckResult = TSteamCheckError | TSteamCheckSuccess;

type TSteamCheckError = {
  status: 'error';
  message: 'Аккаунт Steam не найден';
};

type TSteamCheckSuccess = {
  status: 'success';
  message: 'Аккаунт Steam успешно найден';
  steamUsername: string;
  transactionId: string;
};

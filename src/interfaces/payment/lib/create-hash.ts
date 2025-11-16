import { createHash as cryptoCreateHash } from 'crypto';

export const createHash = (orderUuid: string, secret: string) => {
  const data = `${orderUuid}${secret}`;
  return cryptoCreateHash('sha256').update(data).digest('hex');
};

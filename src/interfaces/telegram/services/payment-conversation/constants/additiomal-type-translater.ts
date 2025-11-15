import { Forms } from 'src/shared/types/additional-group.type';

export const additionalTypeTranslater: Record<keyof Forms, string> = {
  topup_fields: 'TOPUP - Пополнение напрямую на аккаунт',
  voucher_fields: 'VOUCHER - Пополнение через ссылку/код',
};

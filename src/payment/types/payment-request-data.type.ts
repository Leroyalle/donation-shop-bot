interface TinkoffItem {
  Name: string;
  Price: number;
  Quantity: number;
  Amount: number;
  Tax: 'none' | 'vat0' | 'vat10' | 'vat20';
}

interface TinkoffReceipt {
  Items: TinkoffItem[];
  Email: string;
  Phone: string;
  Taxation: 'none' | 'osn' | 'usn_inn' | 'usn_inn_out';
}

interface TinkoffData {
  userId: string | number;
}

export interface PaymentRequest {
  TerminalKey: string;
  Amount: number;
  OrderId: string;
  Description: string;
  Receipt: TinkoffReceipt;
  DATA: TinkoffData;
  Token?: string;
}

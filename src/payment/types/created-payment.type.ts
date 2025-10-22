export interface PaymentResponse {
  data: string;
  error: PaymentError | null;
}

interface PaymentError {
  result: {
    code: number;
    message: string;
    details: string;
    param: {
      additionalProp1: unknown;
      additionalProp2: unknown;
      additionalProp3: unknown;
    };
  };
}

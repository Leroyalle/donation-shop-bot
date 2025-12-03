export interface IIntellectMoneyResponse {
  OperationState: {
    Code: number;
    Desc: string;
  };
  EshopId: number;
  Result: {
    State: {
      Code: number;
      Desc: string;
    };
    InvoiceId: number;
    PaymentWays: Array<{
      Id: number;
      Amount: {
        Amount: number;
        Currency: string;
      };
      InputType: string;
      Preference: string;
      PreferenceTypes: string[];
      ServiceTimeOfEnrollmentType: string;
      Commission: number;
      IsVisible: boolean;
      IsActive: boolean;
      Position: number;
    }>;
  };
}

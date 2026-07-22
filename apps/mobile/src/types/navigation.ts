export type FinancialIntelligenceResource =
  | "account"
  | "asset"
  | "liability"
  | "loan"
  | "investment"
  | "goal";

export type RootStackParamList = {
  Analytics: undefined;
  Budgets: undefined;
  Categories: undefined;
  Login: undefined;
  Dashboard: undefined;
  Events: undefined;
  EventReview: {
    eventId: string;
  };
  FinancialIntelligence:
    | {
        formIntentId?: number;
        initialResource?: FinancialIntelligenceResource;
      }
    | undefined;
  Merchants: undefined;
  Reports: undefined;
  Settings: undefined;
  Transactions: undefined;
};

export interface SubscribeResponse {
  success: boolean;
  simulated?: boolean;
  message?: string;
  error?: string;
  redirectUrl?: string;
  fluentFormSubmitted?: boolean;
  fluentFormInsertId?: number | null;
  brevoSynced?: boolean;
}

export interface BrevoConfig {
  brevoConfigured: boolean;
  listId: string | null;
}

export interface SubscribeResponse {
  success: boolean;
  simulated?: boolean;
  message?: string;
  error?: string;
}

export interface BrevoConfig {
  brevoConfigured: boolean;
  listId: string | null;
}

export interface UserSession {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  tier?: "Basic" | "Pro" | "Chef";
}


export interface PlanRow {
  SALESMANNO: string;
  SALESMANNAMEA: string;
  "Plan GSV": number;
  "Plan ECO": number;
  "Plan PC": number;
  "Plan LPC": number;
  "Plan MVS": number;
  "Dist Name": string;
  "T.L Name": string;
  Channel: string;
  SM: string;
  RSM: string;
  Region: string;
  // New Debt Fields
  Due?: number;
  Overdue?: number;
  "Total Debt"?: number;
}

export interface AchievedRow {
  SALESMANNO: string;
  SALESMANNAMEA: string;
  "Ach GSV": number;
  "Ach ECO": number;
  "Ach PC": number;
  "Ach LPC": number;
  "Ach MVS": number;
  Days: string; // ISO Date String YYYY-MM-DD
}

// The merged row used for display
export interface KPIRow extends PlanRow, Omit<Partial<AchievedRow>, 'SALESMANNO' | 'SALESMANNAMEA'> {
  // Merged properties
}

export interface User {
  username: string;
  password?: string;
  jobTitle?: string;
  role: 'admin' | 'user';
  name?: string;
}

export interface Job {
  title: string;
}

export interface AppConfig {
  syncUrl: string;
  lastUpdated?: string;
}

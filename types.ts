
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
  password?: string; // Only used when sending to server, never stored in client state after login
  jobTitle?: string;
  role: 'admin' | 'user';
  name?: string;
  authToken?: string; // Security Token
  scope?: any; // Defines what this user can see (e.g., { Region: 'Cairo' })
}

export interface Job {
  title: string;
}

export interface AppConfig {
  syncUrl: string;
  lastUpdated?: string;
}

export interface AppMetadata {
  rsmList: string[];
  smList: string[];
  asmList: string[];
  tlList: string[];
  directorList: string[];
  salesmanList: string[]; // "ID - Name"
}

export enum ViewState {
  CITIZEN_DASHBOARD = 'CITIZEN_DASHBOARD',
  CITIZEN_SOS = 'CITIZEN_SOS',
  CITIZEN_SAFE_ROUTE = 'CITIZEN_SAFE_ROUTE',
  CITIZEN_GUARDIAN_REQUEST = 'CITIZEN_GUARDIAN_REQUEST',
  GUARDIAN_DASHBOARD = 'GUARDIAN_DASHBOARD',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  time: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved';
}

export interface Guardian {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  distance: string;
  eta: string;
  badges: string[];
  isFemaleOnly?: boolean;
}
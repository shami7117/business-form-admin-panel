// types/analytics.ts
import { Timestamp } from 'firebase/firestore';

export interface UserSession {
  id?: string;
  sessionId: string;
  timestamp: string;
  userAgent: string;
  currentStep: number;
  formData: Record<string, any>;
  timeSpent: number;
  exitReason?: 'abandoned' | 'completed' | 'ineligible';
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export interface StepAnalytics {
  id?: string;
  sessionId: string;
  step: number;
  stepName: string;
  action: 'enter' | 'answer' | 'exit';
  timestamp: string;
  answer?: any;
  timeSpent?: number;
  exitReason?: 'abandoned' | 'completed' | 'ineligible';
  createdAt: Timestamp | any;
}

export interface AnalyticsSummary {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  averageTimeSpent: number;
  conversionRate: number;
  dropOffByStep: { [stepNumber: number]: number };
}

export interface StepStats {
  stepNumber: number;
  stepName: string;
  entrances: number;
  exits: number;
  averageTimeSpent: number;
  dropOffRate: number;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SessionFilter {
  status: 'all' | 'completed' | 'abandoned' | 'ineligible';
  searchTerm: string;
  dateRange: DateRange;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface StepChartData {
  name: string;
  entrances: number;
  exits: number;
  dropOffRate: number;
  avgTime: number;
}

export interface StatusChartData {
  name: string;
  value: number;
  color: string;
}
// utils/analyticsQueries.ts
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit,
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserSession, StepAnalytics, AnalyticsSummary, StepStats } from '../types/analytics';

export class AnalyticsQueries {
  
  // Get all sessions with pagination
  static async getSessions(limitCount: number = 50, lastDoc?: any) {
    let q = query(
      collection(db, 'sessions'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, 'sessions'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const sessions: UserSession[] = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({ ...(doc.data() as object), id: doc.id } as unknown as UserSession);
    });

    return {
      sessions,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  }

  // Get sessions within date range
  static async getSessionsByDateRange(startDate: Date, endDate: Date) {
    const q = query(
      collection(db, 'sessions'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const sessions: UserSession[] = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({ ...(doc.data() as object), id: doc.id } as unknown as UserSession);
    });

    return sessions;
  }

  // Get step analytics for a specific session
  static async getStepAnalyticsBySession(sessionId: string) {
    const q = query(
      collection(db, 'stepAnalytics'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const stepAnalytics: StepAnalytics[] = [];
    
    querySnapshot.forEach((doc) => {
      stepAnalytics.push({ ...(doc.data() as object), id: doc.id } as unknown as StepAnalytics);
    });

    return stepAnalytics;
  }

  // Get abandoned sessions
  static async getAbandonedSessions(limitCount: number = 50) {
    const q = query(
      collection(db, 'sessions'),
      where('exitReason', '==', 'abandoned'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const sessions: UserSession[] = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({ ...(doc.data() as object), id: doc.id } as unknown as UserSession);
    });

    return sessions;
  }

  // Get completed sessions
  static async getCompletedSessions(limitCount: number = 50) {
    const q = query(
      collection(db, 'sessions'),
      where('exitReason', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const sessions: UserSession[] = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({ ...(doc.data() as object), id: doc.id } as unknown as UserSession);
    });

    return sessions;
  }

  // Get analytics summary
  static async getAnalyticsSummary(startDate?: Date, endDate?: Date): Promise<AnalyticsSummary> {
    let sessionsQuery = query(collection(db, 'sessions'));
    
    if (startDate && endDate) {
      sessionsQuery = query(
        collection(db, 'sessions'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );
    }

    const sessionsSnapshot = await getDocs(sessionsQuery);
    const sessions: UserSession[] = [];
    
    sessionsSnapshot.forEach((doc) => {
      sessions.push(doc.data() as UserSession);
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.exitReason === 'completed').length;
    const abandonedSessions = sessions.filter(s => s.exitReason === 'abandoned').length;
    
    const totalTimeSpent = sessions.reduce((sum, session) => sum + (session.timeSpent || 0), 0);
    const averageTimeSpent = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;
    
    const conversionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Calculate drop-off by step
    const dropOffByStep: { [stepNumber: number]: number } = {};
    sessions.forEach(session => {
      if (session.exitReason === 'abandoned' && session.currentStep !== undefined) {
        dropOffByStep[session.currentStep] = (dropOffByStep[session.currentStep] || 0) + 1;
      }
    });

    return {
      totalSessions,
      completedSessions,
      abandonedSessions,
      averageTimeSpent,
      conversionRate,
      dropOffByStep
    };
  }

  // Get step statistics
  static async getStepStats(): Promise<StepStats[]> {
    const stepAnalyticsQuery = query(collection(db, 'stepAnalytics'));
    const snapshot = await getDocs(stepAnalyticsQuery);
    
    const stepData: { [stepNumber: number]: any } = {};
    
    snapshot.forEach((doc) => {
      const analytics = doc.data() as StepAnalytics;
      const stepNum = analytics.step;
      
      if (!stepData[stepNum]) {
        stepData[stepNum] = {
          stepNumber: stepNum,
          stepName: analytics.stepName,
          entrances: 0,
          exits: 0,
          totalTimeSpent: 0,
          timeSpentCount: 0
        };
      }
      
      if (analytics.action === 'enter') {
        stepData[stepNum].entrances++;
      } else if (analytics.action === 'exit') {
        stepData[stepNum].exits++;
      }
      
      if (analytics.timeSpent) {
        stepData[stepNum].totalTimeSpent += analytics.timeSpent;
        stepData[stepNum].timeSpentCount++;
      }
    });

    return Object.values(stepData).map(step => ({
      stepNumber: step.stepNumber,
      stepName: step.stepName,
      entrances: step.entrances,
      exits: step.exits,
      averageTimeSpent: step.timeSpentCount > 0 ? step.totalTimeSpent / step.timeSpentCount : 0,
      dropOffRate: step.entrances > 0 ? (step.exits / step.entrances) * 100 : 0
    })).sort((a, b) => a.stepNumber - b.stepNumber);
  }
}

export default AnalyticsQueries;
// utils/analytics.ts
import { v4 as uuidv4 } from 'uuid';
import { UserSession, StepAnalytics } from '../types/analytics';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase'; // You'll need to create this

class FormAnalytics {
  private sessionId: string;
  private startTime: Date;
  private stepStartTime: Date;
  private currentStep: number = 0;
  private sessionDocId: string | null = null;

  constructor() {
    this.sessionId = uuidv4();
    this.startTime = new Date();
    this.stepStartTime = new Date();
    this.initializeSession();
  }

  private async initializeSession() {
    const sessionData: UserSession = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      currentStep: 0,
      formData: {},
      timeSpent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      this.sessionDocId = docRef.id;
      console.log('Session initialized with ID:', docRef.id);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  public async trackStepEnter(step: number, stepName: string) {
    this.currentStep = step;
    this.stepStartTime = new Date();
    
    const analyticsData: StepAnalytics = {
      sessionId: this.sessionId,
      step,
      stepName,
      action: 'enter',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'stepAnalytics'), analyticsData);
    } catch (error) {
      console.error('Error tracking step enter:', error);
    }
  }

  public async trackStepAnswer(step: number, stepName: string, answer: any) {
    const timeSpent = Math.round((new Date().getTime() - this.stepStartTime.getTime()) / 1000);
    
    const analyticsData: StepAnalytics = {
      sessionId: this.sessionId,
      step,
      stepName,
      action: 'answer',
      timestamp: new Date().toISOString(),
      answer,
      timeSpent,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'stepAnalytics'), analyticsData);
    } catch (error) {
      console.error('Error tracking step answer:', error);
    }
  }

  public async trackStepExit(step: number, stepName: string, reason: 'abandoned' | 'completed' | 'ineligible') {
    const totalTimeSpent = Math.round((new Date().getTime() - this.startTime.getTime()) / 1000);
    const stepTimeSpent = Math.round((new Date().getTime() - this.stepStartTime.getTime()) / 1000);
    
    // Track step exit
    const analyticsData: StepAnalytics = {
      sessionId: this.sessionId,
      step,
      stepName,
      action: 'exit',
      timestamp: new Date().toISOString(),
      timeSpent: stepTimeSpent,
      exitReason: reason,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'stepAnalytics'), analyticsData);
    } catch (error) {
      console.error('Error tracking step exit:', error);
    }

    // Update session with exit info
    const sessionUpdate = {
      currentStep: step,
      exitReason: reason,
      timeSpent: totalTimeSpent,
      updatedAt: serverTimestamp()
    };

    await this.updateSession(sessionUpdate);
  }

  public async updateFormData(formData: any) {
    const sessionUpdate = {
      formData,
      currentStep: this.currentStep,
      updatedAt: serverTimestamp()
    };

    await this.updateSession(sessionUpdate);
  }

  private async updateSession(updateData: any) {
    if (!this.sessionDocId) {
      console.error('Session document ID not available');
      return;
    }

    try {
      const sessionRef = doc(db, 'sessions', this.sessionDocId);
      await updateDoc(sessionRef, updateData);
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }

  // Track page visibility changes (when user switches tabs or minimizes)
  public initializeVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.trackStepExit(this.currentStep, this.getStepName(this.currentStep), 'abandoned');
      }
    });

    // Track when user is about to leave the page
    window.addEventListener('beforeunload', () => {
      this.trackStepExit(this.currentStep, this.getStepName(this.currentStep), 'abandoned');
    });
  }

  private getStepName(step: number): string {
    const stepNames = [
      'US Resident Check',
      'Credit Score Check', 
      'Late Payments Check',
      'Derogatory Marks Check',
      'Contact Information'
    ];
    return stepNames[step] || `Step ${step}`;
  }

  // Helper method to get session ID (useful for debugging)
  public getSessionId(): string {
    return this.sessionId;
  }

  // Helper method to get current step (useful for debugging)
  public getCurrentStep(): number {
    return this.currentStep;
  }
}

export default FormAnalytics;
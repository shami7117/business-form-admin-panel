// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { AnalyticsQueries } from '../utils/analyticsQueries';
import { formatTime, getConversionRate, calculatePercentChange } from '../utils/adminUtils';

interface DashboardStats {
  totalSessions: number;
  todaySessions: number;
  conversionRate: number;
  avgTimeSpent: number;
  abandonmentRate: number;
  mobileUsers: number;
  desktopUsers: number;
  tabletUsers: number;
  topExitStep: number;
  completedToday: number;
  abandonedToday: number;
}

interface TimeSeriesData {
  date: string;
  sessions: number;
  completed: number;
  abandoned: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = new Date();

      // Load basic analytics summary
      const summary = await AnalyticsQueries.getAnalyticsSummary(startDate, endDate);
      const todaySummary = await AnalyticsQueries.getAnalyticsSummary(startOfDay(new Date()), endDate);
      
      // Load recent sessions for device analysis
      const sessionsResult = await AnalyticsQueries.getSessions(100);
      const sessions = sessionsResult.sessions;
      
      // Calculate device breakdown
      let mobileUsers = 0, desktopUsers = 0, tabletUsers = 0;
      sessions.forEach(session => {
        const userAgent = session.userAgent.toLowerCase();
        if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
          mobileUsers++;
        } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
          tabletUsers++;
        } else {
          desktopUsers++;
        }
      });

      // Find top exit step
      const stepStats = await AnalyticsQueries.getStepStats();
      const topExitStep = stepStats.reduce((max, step) => 
        step.dropOffRate > (stepStats[max]?.dropOffRate || 0) ? step.stepNumber : max, 0
      );

      const dashboardStats: DashboardStats = {
        totalSessions: summary.totalSessions,
        todaySessions: todaySummary.totalSessions,
        conversionRate: summary.conversionRate,
        avgTimeSpent: summary.averageTimeSpent,
        abandonmentRate: (summary.abandonedSessions / summary.totalSessions) * 100,
        mobileUsers,
        desktopUsers,
        tabletUsers,
        topExitStep,
        completedToday: todaySummary.completedSessions,
        abandonedToday: todaySummary.abandonedSessions
      };

      setStats(dashboardStats);
      setRecentSessions(sessions.slice(0, 10));

      // Generate time series data
      const timeData: TimeSeriesData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        const daySessions = sessions.filter(session => {
          const sessionDate = new Date(session.timestamp);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        });

        timeData.push({
          date: format(date, 'MMM d'),
          sessions: daySessions.length,
          completed: daySessions.filter(s => s.exitReason === 'completed').length,
          abandoned: daySessions.filter(s => s.exitReason === 'abandoned').length
        });
      }
      
      setTimeSeriesData(timeData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (exitReason?: string) => {
    switch (exitReason) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'abandoned':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Abandoned</Badge>;
      case 'ineligible':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Ineligible</Badge>;
      default:
        return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  const deviceData = stats ? [
    { name: 'Desktop', value: stats.desktopUsers, color: COLORS[0] },
    { name: 'Mobile', value: stats.mobileUsers, color: COLORS[1] },
    { name: 'Tablet', value: stats.tabletUsers, color: COLORS[2] }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your ZCF
          </p>
        </div>
        <div className="flex space-x-2">
          <div className="flex rounded-md shadow-sm">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className={`${
                  period !== '90d' ? 'rounded-r-none border-r-0' : ''
                } ${period !== '7d' ? 'rounded-l-none' : ''}`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
              <div className="flex items-center pt-1">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-xs text-green-600">
                  +{stats.todaySessions} today
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <div className="flex items-center pt-1">
                {stats.conversionRate > 50 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <p className={`text-xs ${stats.conversionRate > 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.completedToday} completed today
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(Math.round(stats.avgTimeSpent))}</div>
              <p className="text-xs text-muted-foreground pt-1">
                Per session duration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abandonment Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.abandonmentRate.toFixed(1)}%</div>
              <div className="flex items-center pt-1">
                <ArrowUpRight className="h-4 w-4 text-red-500 mr-1" />
                <p className="text-xs text-red-600">
                  {stats.abandonedToday} abandoned today
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions Over Time</CardTitle>
            <CardDescription>Daily session count for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="sessions" 
                  stackId="1"
                  stroke="#0088FE" 
                  fill="#0088FE" 
                  fillOpacity={0.6}
                  name="Total Sessions"
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="2"
                  stroke="#00C49F" 
                  fill="#00C49F" 
                  fillOpacity={0.6}
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>User sessions by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Completion vs Abandonment */}
      <Card>
        <CardHeader>
          <CardTitle>Session Outcomes</CardTitle>
          <CardDescription>Completed vs abandoned sessions over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#00C49F" 
                strokeWidth={2}
                name="Completed"
              />
              <Line 
                type="monotone" 
                dataKey="abandoned" 
                stroke="#FF8042" 
                strokeWidth={2}
                name="Abandoned"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Sessions
            </CardTitle>
            <CardDescription>Latest user activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSessions.map((session, index) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="text-sm font-medium">
                        {session.sessionId.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.timestamp), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Step {session.currentStep}</Badge>
                    {getStatusBadge(session.exitReason)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Desktop Users</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stats.desktopUsers}</p>
                      <p className="text-xs text-muted-foreground">
                        {((stats.desktopUsers / stats.totalSessions) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Mobile Users</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stats.mobileUsers}</p>
                      <p className="text-xs text-muted-foreground">
                        {((stats.mobileUsers / stats.totalSessions) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Tablet className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Tablet Users</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stats.tabletUsers}</p>
                      <p className="text-xs text-muted-foreground">
                        {((stats.tabletUsers / stats.totalSessions) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Top Exit Step</span>
                      </div>
                      <Badge variant="destructive">Step {stats.topExitStep}</Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// app/admin/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  CalendarDays,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { AnalyticsQueries } from '../../utils/analyticsQueries';

// Types
interface UserSession {
  id: string;
  sessionId: string;
  timestamp: string;
  userAgent: string;
  currentStep: number;
  formData: any;
  timeSpent: number;
  exitReason?: 'abandoned' | 'completed' | 'ineligible';
  createdAt: any;
  updatedAt: any;
}

interface StepAnalytics {
  id: string;
  sessionId: string;
  step: number;
  stepName: string;
  action: 'enter' | 'answer' | 'exit';
  timestamp: string;
  answer?: any;
  timeSpent?: number;
  exitReason?: string;
  createdAt: any;
}

interface AnalyticsSummary {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  averageTimeSpent: number;
  conversionRate: number;
  dropOffByStep: { [stepNumber: number]: number };
}

interface StepStats {
  stepNumber: number;
  stepName: string;
  entrances: number;
  exits: number;
  averageTimeSpent: number;
  dropOffRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsAdminPanel() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [stepStats, setStepStats] = useState<StepStats[]>([]);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<StepAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load initial data
  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange, filterStatus]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load sessions
      let sessionsData:any;
      if (filterStatus === 'completed') {
        sessionsData = await AnalyticsQueries.getCompletedSessions(100);
      } else if (filterStatus === 'abandoned') {
        sessionsData = await AnalyticsQueries.getAbandonedSessions(100);
      } else if (dateRange.from && dateRange.to) {
        sessionsData = await AnalyticsQueries.getSessionsByDateRange(dateRange.from, dateRange.to);
      } else {
        const result = await AnalyticsQueries.getSessions(100);
        sessionsData = result.sessions;
      }
      
      setSessions(sessionsData);

      // Load summary
      const summaryData = await AnalyticsQueries.getAnalyticsSummary(dateRange.from, dateRange.to);
      setSummary(summaryData);

      // Load step statistics
      const stepStatsData = await AnalyticsQueries.getStepStats();
      setStepStats(stepStatsData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (session: UserSession) => {
    setSelectedSession(session);
    try {
      const details:any = await AnalyticsQueries.getStepAnalyticsBySession(session.sessionId);
      setSessionDetails(details);
    } catch (error) {
      console.error('Error loading session details:', error);
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.userAgent.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Chart data preparation
  const stepChartData = stepStats.map(step => ({
    name: step.stepName,
    entrances: step.entrances,
    exits: step.exits,
    dropOffRate: step.dropOffRate,
    avgTime: step.averageTimeSpent
  }));

  const statusChartData = summary ? [
    { name: 'Completed', value: summary.completedSessions, color: '#00C49F' },
    { name: 'Abandoned', value: summary.abandonedSessions, color: '#FF8042' },
    { name: 'In Progress', value: summary.totalSessions - summary.completedSessions - summary.abandonedSessions, color: '#FFBB28' }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ZCF Dashboard</h1>
          <p className="text-muted-foreground">Monitor user behavior and form performance</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadAnalyticsData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Sessions</Label>
              <Input
                id="search"
                placeholder="Session ID or User Agent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSessions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.conversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(Math.round(summary.averageTimeSpent))}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abandoned Sessions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.abandonedSessions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="steps">Step Analysis</TabsTrigger>
          <TabsTrigger value="details">Session Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stepChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="entrances" fill="#0088FE" name="Entrances" />
                    <Bar dataKey="exits" fill="#FF8042" name="Exits" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>User Sessions ({filteredSessions.length})</CardTitle>
              <CardDescription>Click on a session to view detailed step-by-step analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-sm">
                        {session.sessionId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{getStatusBadge(session.exitReason)}</TableCell>
                      <TableCell>{session.currentStep}</TableCell>
                      <TableCell>{formatTime(session.timeSpent || 0)}</TableCell>
                      <TableCell>{format(new Date(session.timestamp), 'MMM d, HH:mm')}</TableCell>
                      <TableCell className="truncate max-w-xs">
                        {session.userAgent.substring(0, 50)}...
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadSessionDetails(session)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>Step Analysis</CardTitle>
              <CardDescription>Performance metrics for each form step</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Step Name</TableHead>
                    <TableHead>Entrances</TableHead>
                    <TableHead>Exits</TableHead>
                    <TableHead>Drop-off Rate</TableHead>
                    <TableHead>Avg. Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stepStats.map((step) => (
                    <TableRow key={step.stepNumber}>
                      <TableCell>{step.stepNumber}</TableCell>
                      <TableCell>{step.stepName}</TableCell>
                      <TableCell>{step.entrances}</TableCell>
                      <TableCell>{step.exits}</TableCell>
                      <TableCell>
                        <Badge variant={step.dropOffRate > 50 ? "destructive" : "secondary"}>
                          {step.dropOffRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTime(Math.round(step.averageTimeSpent))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {selectedSession ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session Details: {selectedSession.sessionId}</CardTitle>
                  <CardDescription>
                    Status: {getStatusBadge(selectedSession.exitReason)} | 
                    Total Time: {formatTime(selectedSession.timeSpent || 0)} |
                    Created: {format(new Date(selectedSession.timestamp), 'MMM d, yyyy HH:mm')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Form Data</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {JSON.stringify(selectedSession.formData, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">User Agent</h4>
                      <p className="text-sm bg-gray-100 p-2 rounded">{selectedSession.userAgent}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step-by-Step Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Step</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Time Spent</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Answer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionDetails.map((detail, index) => (
                        <TableRow key={index}>
                          <TableCell>{detail.step} - {detail.stepName}</TableCell>
                          <TableCell>
                            <Badge variant={
                              detail.action === 'enter' ? 'default' : 
                              detail.action === 'answer' ? 'secondary' : 'destructive'
                            }>
                              {detail.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {detail.timeSpent ? formatTime(detail.timeSpent) : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(detail.timestamp), 'HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            {detail.answer ? (
                              <code className="text-xs bg-gray-100 px-1 rounded">
                                {JSON.stringify(detail.answer)}
                              </code>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Session Selected</h3>
                  <p className="text-muted-foreground">
                    Go to the Sessions tab and click on a session to view its details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
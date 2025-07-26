// app/admin/sessions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { AnalyticsQueries } from '../../utils/analyticsQueries';
import { UserSession, StepAnalytics } from '../../types/analytics';

interface SessionWithDetails extends UserSession {
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithDetails[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [sessionDetails, setSessionDetails] = useState<StepAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'step'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    filterAndSortSessions();
  }, [sessions, searchTerm, statusFilter, deviceFilter, sortBy, sortOrder]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const result = await AnalyticsQueries.getSessions(200);
      const sessionsWithDeviceInfo = result.sessions.map(session => ({
        ...session,
        ...parseUserAgent(session.userAgent)
      }));
      setSessions(sessionsWithDeviceInfo);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseUserAgent = (userAgent: string) => {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  };

  const filterAndSortSessions = () => {
    let filtered = sessions.filter(session => {
      const matchesSearch = session.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.userAgent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.browser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.os?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || session.exitReason === statusFilter;
      const matchesDevice = deviceFilter === 'all' || session.deviceType === deviceFilter;

      return matchesSearch && matchesStatus && matchesDevice;
    });

    // Sort sessions
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'duration':
          comparison = (a.timeSpent || 0) - (b.timeSpent || 0);
          break;
        case 'step':
          comparison = a.currentStep - b.currentStep;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredSessions(filtered);
  };

  const loadSessionDetails = async (session: SessionWithDetails) => {
    setSelectedSession(session);
    try {
      const details = await AnalyticsQueries.getStepAnalyticsBySession(session.sessionId);
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

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportSessions = () => {
    const csvContent = [
      ['Session ID', 'Status', 'Device Type', 'Browser', 'OS', 'Current Step', 'Time Spent', 'Created'],
      ...filteredSessions.map(session => [
        session.sessionId,
        session.exitReason || 'in-progress',
        session.deviceType || 'unknown',
        session.browser || 'unknown',
        session.os || 'unknown',
        session.currentStep.toString(),
        (session.timeSpent || 0).toString(),
        format(new Date(session.timestamp), 'yyyy-MM-dd HH:mm:ss')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground">Monitor and analyze individual user sessions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadSessions} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportSessions} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredSessions.length} filtered
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => !s.exitReason).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Users</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.deviceType === 'mobile').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {((sessions.filter(s => s.deviceType === 'mobile').length / sessions.length) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(Math.round(sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / sessions.length))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search Sessions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Session ID, browser, OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                  <SelectItem value="ineligible">Ineligible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Device</Label>
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={(value: 'date' | 'duration' | 'step') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="step">Current Step</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Order</Label>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full justify-start"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions ({filteredSessions.length})</CardTitle>
          <CardDescription>Click on a session to view detailed step-by-step analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser/OS</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
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
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(session.deviceType)}
                        <span className="capitalize">{session.deviceType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{session.browser}</div>
                        <div className="text-muted-foreground">{session.os}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Step {session.currentStep}</Badge>
                    </TableCell>
                    <TableCell>{formatTime(session.timeSpent || 0)}</TableCell>
                    <TableCell>{format(new Date(session.timestamp), 'MMM d, HH:mm')}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadSessionDetails(session)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Session Details: {session.sessionId}</DialogTitle>
                            <DialogDescription>
                              Detailed step-by-step analytics and user data
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedSession && (
                            <Tabs defaultValue="overview" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="steps">Step Analytics</TabsTrigger>
                                <TabsTrigger value="data">Form Data</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="overview" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">Session Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Status:</span>
                                        {getStatusBadge(selectedSession.exitReason)}
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Duration:</span>
                                        <span>{formatTime(selectedSession.timeSpent || 0)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Current Step:</span>
                                        <Badge variant="outline">Step {selectedSession.currentStep}</Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Created:</span>
                                        <span>{format(new Date(selectedSession.timestamp), 'MMM d, yyyy HH:mm')}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">Device Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Device:</span>
                                        <div className="flex items-center space-x-1">
                                          {getDeviceIcon(selectedSession.deviceType)}
                                          <span className="capitalize">{selectedSession.deviceType}</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Browser:</span>
                                        <span>{selectedSession.browser}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">OS:</span>
                                        <span>{selectedSession.os}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="steps">
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
                              </TabsContent>
                              
                              <TabsContent value="data">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Form Data</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                                      {JSON.stringify(selectedSession.formData, null, 2)}
                                    </pre>
                                  </CardContent>
                                </Card>
                                
                                <Card className="mt-4">
                                  <CardHeader>
                                    <CardTitle className="text-sm">User Agent</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm bg-gray-100 p-2 rounded break-all">
                                      {selectedSession.userAgent}
                                    </p>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
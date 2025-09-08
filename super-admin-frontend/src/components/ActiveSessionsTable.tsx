import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  StopCircle, 
  Clock, 
  User, 
  Shield, 
  Globe,
  Smartphone
} from 'lucide-react';
import { ActiveSession } from '@/types/impersonation';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface ActiveSessionsTableProps {
  sessions: ActiveSession[];
  onTerminateSession: (sessionId: string) => void;
  isLoading?: boolean;
  terminatingSessionId?: string;
}

const ActiveSessionsTable: React.FC<ActiveSessionsTableProps> = ({
  sessions,
  onTerminateSession,
  isLoading = false,
  terminatingSessionId,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">فعال</Badge>;
      case 'expired':
        return <Badge variant="error">منقضی شده</Badge>;
      case 'terminated':
        return <Badge variant="secondary">خاتمه یافته</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    try {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        return 'منقضی شده';
      }
      
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours} ساعت و ${remainingMinutes} دقیقه`;
      } else {
        return `${remainingMinutes} دقیقه`;
      }
    } catch {
      return 'نامشخص';
    }
  };

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return 'نامشخص';
    
    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'نامشخص';
  };

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            جلسات فعال جانشینی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-slate-500">در حال بارگذاری جلسات...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          جلسات فعال جانشینی
          <Badge variant="secondary" className="mr-2">
            {sessions?.length || 0} جلسه
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!sessions || sessions.length === 0 ? (
          <div className="flex items-center justify-center h-32 p-6">
            <div className="text-slate-500">هیچ جلسه فعالی وجود ندارد</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شناسه جلسه</TableHead>
                <TableHead>ادمین</TableHead>
                <TableHead>کاربر هدف</TableHead>
                <TableHead>تنانت</TableHead>
                <TableHead>شروع</TableHead>
                <TableHead>زمان باقی‌مانده</TableHead>
                <TableHead>IP آدرس</TableHead>
                <TableHead>مرورگر</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.session_id}>
                  <TableCell className="font-mono text-sm">
                    {session.session_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        {session.admin_user_id.substring(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {session.target_user_id.substring(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.target_tenant_id ? (
                      <span className="text-sm text-slate-600">
                        {session.target_tenant_id.substring(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600">
                      {formatDate(session.started_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">
                        {getTimeRemaining(session.expires_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {session.ip_address || 'نامشخص'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {getBrowserInfo(session.user_agent)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(session.status)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onTerminateSession(session.session_id)}
                      disabled={
                        session.status !== 'active' || 
                        terminatingSessionId === session.session_id
                      }
                      className="h-8 px-3"
                    >
                      <StopCircle className="h-4 w-4 mr-1" />
                      {terminatingSessionId === session.session_id 
                        ? 'در حال خاتمه...' 
                        : 'خاتمه جلسه'
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveSessionsTable;
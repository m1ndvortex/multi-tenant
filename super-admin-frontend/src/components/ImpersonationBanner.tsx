import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, LogOut, Clock, User, Shield } from 'lucide-react';
import { impersonationService } from '@/services/impersonationService';
import { CurrentSessionInfo } from '@/types/impersonation';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface ImpersonationBannerProps {
  onEndImpersonation?: () => void;
}

const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  onEndImpersonation,
}) => {
  const [sessionInfo, setSessionInfo] = useState<CurrentSessionInfo | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    // Check if we're in an impersonation session
    const checkSession = async () => {
      try {
        const info = await impersonationService.getCurrentSession();
        setSessionInfo(info);
      } catch (error) {
        // Not in impersonation session or error occurred
        setSessionInfo(null);
      }
    };

    checkSession();

    // Update time remaining every minute
    const interval = setInterval(() => {
      if (sessionInfo) {
        const now = new Date();
        const currentTime = new Date(sessionInfo.current_time);
        const elapsed = Math.floor((now.getTime() - currentTime.getTime()) / 1000 / 60);
        
        if (elapsed < 120) { // 2 hours default session
          const remaining = 120 - elapsed;
          setTimeRemaining(`${remaining} دقیقه باقی‌مانده`);
        } else {
          setTimeRemaining('منقضی شده');
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [sessionInfo]);

  const handleEndImpersonation = async () => {
    if (!sessionInfo) return;

    setIsEnding(true);
    try {
      await impersonationService.endImpersonation();
      
      // Call the callback if provided
      if (onEndImpersonation) {
        onEndImpersonation();
      } else {
        // Default behavior: return to super admin
        impersonationService.returnFromImpersonation();
      }
    } catch (error) {
      console.error('Failed to end impersonation:', error);
      // Force return anyway
      impersonationService.returnFromImpersonation();
    } finally {
      setIsEnding(false);
    }
  };

  // Don't render if not in impersonation session
  if (!sessionInfo || !sessionInfo.is_impersonation) {
    return null;
  }

  return (
    <Card className="fixed top-0 left-0 right-0 z-50 rounded-none border-0 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Warning Icon */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-200" />
            <Badge variant="outline" className="border-white/30 text-white bg-white/10">
              حالت جانشینی
            </Badge>
          </div>

          {/* Session Info */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>ادمین: {sessionInfo.admin_user_id}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>کاربر هدف: {sessionInfo.target_user_id}</span>
            </div>

            {sessionInfo.target_tenant_id && (
              <div className="flex items-center gap-2">
                <span>تنانت: {sessionInfo.target_tenant_id}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{timeRemaining}</span>
            </div>
          </div>
        </div>

        {/* End Impersonation Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleEndImpersonation}
          disabled={isEnding}
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isEnding ? 'در حال پایان...' : 'پایان جانشینی'}
        </Button>
      </div>
    </Card>
  );
};

export default ImpersonationBanner;
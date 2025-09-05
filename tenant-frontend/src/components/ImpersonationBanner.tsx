import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, LogOut, Clock, User } from 'lucide-react';

interface ImpersonationBannerProps {
  onEndImpersonation?: () => void;
}

const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  onEndImpersonation,
}) => {
  const [isImpersonation, setIsImpersonation] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    // Check if we're in an impersonation session
    const checkImpersonation = () => {
      const impersonationToken = localStorage.getItem('impersonation_token');
      const targetUserData = localStorage.getItem('impersonation_target_user');
      const urlParams = new URLSearchParams(window.location.search);
      const isImpersonationParam = urlParams.get('impersonation');

      if (impersonationToken && targetUserData && isImpersonationParam === 'true') {
        setIsImpersonation(true);
        try {
          setTargetUser(JSON.parse(targetUserData));
        } catch (error) {
          console.error('Failed to parse target user data:', error);
        }
      } else {
        setIsImpersonation(false);
        setTargetUser(null);
      }
    };

    checkImpersonation();

    // Listen for storage changes (in case impersonation is ended from another tab)
    const handleStorageChange = () => {
      checkImpersonation();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleEndImpersonation = async () => {
    setIsEnding(true);
    try {
      // Call the API to end impersonation
      const token = localStorage.getItem('super_admin_token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      await fetch(`${API_BASE_URL}/api/super-admin/impersonation/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({}),
      });

      // Clear impersonation data
      localStorage.removeItem('impersonation_token');
      localStorage.removeItem('impersonation_target_user');

      // Call the callback if provided
      if (onEndImpersonation) {
        onEndImpersonation();
      } else {
        // Default behavior: return to super admin
        const superAdminUrl = process.env.REACT_APP_SUPER_ADMIN_URL || 'http://localhost:3000';
        window.location.href = `${superAdminUrl}/impersonation`;
      }
    } catch (error) {
      console.error('Failed to end impersonation:', error);
      // Force return anyway
      localStorage.removeItem('impersonation_token');
      localStorage.removeItem('impersonation_target_user');
      const superAdminUrl = process.env.REACT_APP_SUPER_ADMIN_URL || 'http://localhost:3000';
      window.location.href = `${superAdminUrl}/impersonation`;
    } finally {
      setIsEnding(false);
    }
  };

  // Don't render if not in impersonation session
  if (!isImpersonation || !targetUser) {
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
              <User className="h-4 w-4" />
              <span>کاربر: {targetUser.email}</span>
            </div>
            
            {targetUser.tenant_name && (
              <div className="flex items-center gap-2">
                <span>تنانت: {targetUser.tenant_name}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>جلسه فعال</span>
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
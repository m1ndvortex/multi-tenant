import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface SessionManagementOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  checkIntervalSeconds?: number;
}

export const useSessionManagement = (options: SessionManagementOptions = {}) => {
  const {
    timeoutMinutes = 30, // 30 minutes default timeout
    warningMinutes = 5,  // 5 minutes warning before timeout
    checkIntervalSeconds = 60 // Check every minute
  } = options;

  const { logout, isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  // Update last activity time
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    warningShownRef.current = false;
  };

  // Check session timeout
  const checkTimeout = () => {
    if (!isAuthenticated || !token) {
      return;
    }

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutes * 60 * 1000;
    const remaining = timeoutMs - timeSinceActivity;

    setTimeRemaining(Math.max(0, Math.ceil(remaining / 1000 / 60))); // in minutes

    // Show warning
    if (remaining <= warningMs && remaining > 0 && !warningShownRef.current) {
      setShowWarning(true);
      warningShownRef.current = true;
      
      toast({
        title: "هشدار انقضای جلسه",
        description: `جلسه شما در ${Math.ceil(remaining / 1000 / 60)} دقیقه منقضی خواهد شد`,
        variant: "destructive",
      });
    }

    // Auto logout
    if (remaining <= 0) {
      toast({
        title: "جلسه منقضی شد",
        description: "به دلیل عدم فعالیت، از سیستم خارج شدید",
        variant: "destructive",
      });
      
      logout();
    }
  };

  // Extend session
  const extendSession = () => {
    updateActivity();
    toast({
      title: "جلسه تمدید شد",
      description: "جلسه شما با موفقیت تمدید شد",
      variant: "default",
    });
  };

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start interval check
    intervalRef.current = setInterval(checkTimeout, checkIntervalSeconds * 1000);

    // Initial activity update
    updateActivity();

    return () => {
      // Remove event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timeRemaining,
    showWarning,
    extendSession,
    updateActivity,
  };
};
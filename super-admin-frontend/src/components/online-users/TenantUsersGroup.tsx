/**
 * Tenant Users Group Component
 * Groups online users by tenant with expandable sections
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
// Button import removed as it's not used
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  UserCheck, 
  UserX,
  Building2,
  Activity
} from 'lucide-react';
import { TenantOnlineUsers, OnlineUser } from '../../types/onlineUsers';
import OnlineUsersTable from './OnlineUsersTable';

interface TenantUsersGroupProps {
  tenantUsers: TenantOnlineUsers;
  expanded?: boolean;
  onToggle?: () => void;
  onUserSelect?: (user: OnlineUser) => void;
  onSetOffline?: (userId: string) => void;
  onViewSession?: (userId: string) => void;
  className?: string;
}

export const TenantUsersGroup: React.FC<TenantUsersGroupProps> = ({
  tenantUsers,
  expanded = false,
  onToggle,
  onUserSelect,
  onSetOffline,
  onViewSession,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.();
  };

  const totalUsers = tenantUsers.online_users_count + tenantUsers.offline_users_count;
  const onlinePercentage = totalUsers > 0 
    ? Math.round((tenantUsers.online_users_count / totalUsers) * 100) 
    : 0;

  return (
    <Card className={`bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100"
            onClick={handleToggle}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {tenantUsers.tenant_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    شناسه: {tenantUsers.tenant_id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Online Users Count */}
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {tenantUsers.online_users_count} آنلاین
                  </Badge>
                </div>

                {/* Offline Users Count */}
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-gray-500" />
                  <Badge variant="outline" className="text-gray-600">
                    {tenantUsers.offline_users_count} آفلاین
                  </Badge>
                </div>

                {/* Total Users */}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    {totalUsers} کل
                  </Badge>
                </div>

                {/* Online Percentage */}
                {totalUsers > 0 && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                      {onlinePercentage}% فعال
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {totalUsers > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>نرخ فعالیت</span>
                  <span>{onlinePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${onlinePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0">
            {tenantUsers.users.length > 0 ? (
              <OnlineUsersTable
                users={tenantUsers.users}
                onUserSelect={onUserSelect}
                onSetOffline={onSetOffline}
                onViewSession={onViewSession}
                className="border-0 shadow-none"
              />
            ) : (
              <div className="p-8 text-center">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  هیچ کاربر آنلاینی یافت نشد
                </h4>
                <p className="text-gray-500">
                  در حال حاضر هیچ کاربری از این تنانت آنلاین نیست.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TenantUsersGroup;
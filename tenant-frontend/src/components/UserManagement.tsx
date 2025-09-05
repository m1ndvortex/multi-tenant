import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  User, 
  Calculator,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface UserManagementProps {
  className?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ className }) => {
  const { user: currentUser } = useAuth();
  const { tenant } = useTenant();
  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'admin@example.com',
      role: 'admin',
      is_active: true,
      last_login: '2024-01-15T10:30:00Z',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      email: 'user@example.com',
      role: 'user',
      is_active: true,
      last_login: '2024-01-14T15:45:00Z',
      created_at: '2024-01-05T00:00:00Z'
    }
  ]);

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      'admin': Shield,
      'manager': Crown,
      'user': User,
      'accountant': Calculator
    };
    return icons[role] || User;
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'admin': 'مدیر',
      'manager': 'مدیر عامل',
      'user': 'کاربر',
      'accountant': 'حسابدار'
    };
    return roleLabels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, string> = {
      'admin': 'gradient-purple',
      'manager': 'gradient-blue',
      'user': 'gradient-green',
      'accountant': 'gradient-orange'
    };
    return variants[role] || 'default';
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'هرگز';
    return new Date(lastLogin).toLocaleDateString('fa-IR');
  };

  const canManageUsers = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'manager';
  };

  const getSubscriptionLimits = () => {
    if (tenant?.subscription_type === 'pro') {
      return { maxUsers: 5, current: users.length };
    }
    return { maxUsers: 1, current: users.length };
  };

  const limits = getSubscriptionLimits();
  const canAddUser = limits.current < limits.maxUsers && canManageUsers();
  const isAtCapacity = limits.current >= limits.maxUsers;

  return (
    <Card variant="professional" className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <CardTitle>مدیریت کاربران</CardTitle>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Badge variant="info" className="text-xs">
              {limits.current} از {limits.maxUsers} کاربر
            </Badge>
            
            {canManageUsers() && (
              <>
                {canAddUser ? (
                  <Button variant="gradient-green" size="sm">
                    <UserPlus className="h-4 w-4 ml-1" />
                    افزودن کاربر
                  </Button>
                ) : isAtCapacity ? (
                  <div className="flex items-center space-x-1 space-x-reverse">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-orange-600">
                      حد مجاز کاربران
                    </span>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => {
            const RoleIcon = getRoleIcon(user.role);
            const isCurrentUser = user.id === currentUser?.id;
            
            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                  isCurrentUser 
                    ? "bg-gradient-to-r from-green-50 to-teal-50 border-green-200" 
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm">
                      {getUserInitials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <p className="font-medium text-slate-900">
                        {user.email}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="success" className="text-xs">
                          شما
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse mt-1">
                      <Badge 
                        variant={getRoleBadgeVariant(user.role) as any}
                        className="text-xs flex items-center space-x-1 space-x-reverse"
                      >
                        <RoleIcon className="h-3 w-3" data-lucide={user.role === 'admin' ? 'shield' : 'user'} />
                        <span>{getRoleLabel(user.role)}</span>
                      </Badge>
                      <span className="text-xs text-slate-500">
                        آخرین ورود: {formatLastLogin(user.last_login)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    user.is_active ? "bg-green-500" : "bg-red-500"
                  )} />
                  
                  {canManageUsers() && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" data-lucide="more-vertical" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          ویرایش نقش
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {user.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          حذف کاربر
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {tenant?.subscription_type === 'free' && (
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Crown className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-orange-800">
                برای افزودن کاربران بیشتر، اشتراک خود را به پرو ارتقا دهید
              </p>
              <Button variant="gradient-green" size="sm">
                ارتقا به پرو
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
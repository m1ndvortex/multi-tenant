import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  Calendar,
  Shield,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { apiAccessService, ApiKey, ApiKeyCreateRequest } from '@/services/apiAccessService';
import { useToast } from '@/hooks/use-toast';

const ApiKeyManagement: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiAccessService.getApiKeys(),
  });

  const { data: availablePermissions } = useQuery({
    queryKey: ['api-permissions'],
    queryFn: () => apiAccessService.getAvailablePermissions(),
  });

  const createKeyMutation = useMutation({
    mutationFn: (request: ApiKeyCreateRequest) => apiAccessService.createApiKey(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setShowCreateDialog(false);
      toast({
        title: 'کلید API ایجاد شد',
        description: 'کلید API جدید با موفقیت ایجاد شد.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در ایجاد کلید API',
        description: error.message || 'خطایی در ایجاد کلید API رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiAccessService.deleteApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'کلید API حذف شد',
        description: 'کلید API با موفقیت حذف شد.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در حذف کلید API',
        description: error.message || 'خطایی در حذف کلید API رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiAccessService.regenerateApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'کلید API بازتولید شد',
        description: 'کلید API جدید تولید شد. کلید قبلی دیگر معتبر نیست.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در بازتولید کلید API',
        description: error.message || 'خطایی در بازتولید کلید API رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'کپی شد',
        description: 'کلید API در کلیپ‌بورد کپی شد.',
      });
    } catch (error) {
      toast({
        title: 'خطا در کپی',
        description: 'امکان کپی کردن وجود ندارد.',
        variant: 'destructive',
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const formatKey = (key: string, isVisible: boolean) => {
    if (isVisible) return key;
    return key.substring(0, 8) + '••••••••••••••••••••••••';
  };

  const getStatusBadge = (apiKey: ApiKey) => {
    if (!apiKey.is_active) {
      return <Badge variant="secondary">غیرفعال</Badge>;
    }
    
    if (apiKey.expires_at) {
      const expiryDate = new Date(apiKey.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        return <Badge variant="destructive">منقضی شده</Badge>;
      } else if (daysUntilExpiry <= 7) {
        return <Badge variant="destructive">به زودی منقضی می‌شود</Badge>;
      }
    }
    
    return <Badge variant="default" className="bg-green-100 text-green-800">فعال</Badge>;
  };

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-600">در حال بارگذاری...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">کلیدهای API</h2>
          <p className="text-sm text-gray-600 mt-1">مدیریت کلیدهای دسترسی به API</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="gradient-blue">
              <Plus className="h-4 w-4 ml-2" />
              کلید جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ایجاد کلید API جدید</DialogTitle>
            </DialogHeader>
            <CreateApiKeyForm 
              onSubmit={(data) => createKeyMutation.mutate(data)}
              availablePermissions={availablePermissions || []}
              isLoading={createKeyMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      {!apiKeys || apiKeys.length === 0 ? (
        <Card variant="professional">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">هنوز کلید API ایجاد نکرده‌اید</h3>
            <p className="text-gray-600 mb-6">
              برای شروع استفاده از API، اولین کلید خود را ایجاد کنید.
            </p>
            <Button 
              variant="gradient-blue" 
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 ml-2" />
              ایجاد اولین کلید
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} variant="professional">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Key className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{apiKey.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(apiKey)}
                          {apiKey.last_used_at && (
                            <Badge variant="outline" className="text-xs">
                              <Activity className="h-3 w-3 ml-1" />
                              آخرین استفاده: {new Date(apiKey.last_used_at).toLocaleDateString('fa-IR')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* API Key Display */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-gray-800 flex-1">
                          {formatKey(apiKey.key, visibleKeys.has(apiKey.id))}
                        </code>
                        <div className="flex items-center gap-2 mr-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="mb-3">
                      <Label className="text-xs text-gray-600 mb-2 block">مجوزها:</Label>
                      <div className="flex flex-wrap gap-1">
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        ایجاد: {new Date(apiKey.created_at).toLocaleDateString('fa-IR')}
                      </div>
                      {apiKey.expires_at && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          انقضا: {new Date(apiKey.expires_at).toLocaleDateString('fa-IR')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateKeyMutation.mutate(apiKey.id)}
                      disabled={regenerateKeyMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerateKeyMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteKeyMutation.mutate(apiKey.id)}
                      disabled={deleteKeyMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Create API Key Form Component
interface CreateApiKeyFormProps {
  onSubmit: (data: ApiKeyCreateRequest) => void;
  availablePermissions: Array<{ key: string; name: string; description: string }>;
  isLoading: boolean;
}

const CreateApiKeyForm: React.FC<CreateApiKeyFormProps> = ({ 
  onSubmit, 
  availablePermissions, 
  isLoading 
}) => {
  const [formData, setFormData] = useState<ApiKeyCreateRequest>({
    name: '',
    permissions: [],
    expires_at: undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">نام کلید</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="مثال: کلید تولید، کلید توسعه"
          required
        />
      </div>

      <div>
        <Label>مجوزها</Label>
        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
          {availablePermissions.map((permission) => (
            <div key={permission.key} className="flex items-start space-x-2 space-x-reverse">
              <Checkbox
                id={permission.key}
                checked={formData.permissions.includes(permission.key)}
                onCheckedChange={(checked) => 
                  handlePermissionChange(permission.key, checked as boolean)
                }
              />
              <div className="flex-1">
                <Label htmlFor={permission.key} className="text-sm font-medium">
                  {permission.name}
                </Label>
                <p className="text-xs text-gray-600">{permission.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="expires_at">تاریخ انقضا (اختیاری)</Label>
        <Input
          id="expires_at"
          type="date"
          value={formData.expires_at || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            expires_at: e.target.value || undefined 
          }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading || !formData.name || formData.permissions.length === 0}>
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              در حال ایجاد...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 ml-2" />
              ایجاد کلید
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ApiKeyManagement;
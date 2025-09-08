import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  PlusIcon,
  EditIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon
} from 'lucide-react';
import { RetentionPolicy } from '@/types/backupMonitoring';
import { backupMonitoringService } from '@/services/backupMonitoringService';
import { useToast } from '@/hooks/use-toast';

const RetentionPolicyManagement: React.FC = () => {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    backup_type: 'tenant' as 'tenant' | 'disaster_recovery',
    retention_days: 30,
    max_backups_per_tenant: 10,
    auto_cleanup_enabled: true,
    storage_providers: ['backblaze_b2'] as ('backblaze_b2' | 'cloudflare_r2')[],
    is_active: true,
  });
  const { toast } = useToast();

  const fetchPolicies = async () => {
    try {
      const data = await backupMonitoringService.getRetentionPolicies();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch retention policies:', error);
      toast({
        title: 'خطا در دریافت سیاست‌ها',
        description: 'امکان دریافت سیاست‌های نگهداری وجود ندارد',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPolicy) {
        await backupMonitoringService.updateRetentionPolicy(editingPolicy.id, formData);
        toast({
          title: 'سیاست بروزرسانی شد',
          description: 'سیاست نگهداری با موفقیت بروزرسانی شد',
        });
      } else {
        await backupMonitoringService.createRetentionPolicy(formData);
        toast({
          title: 'سیاست ایجاد شد',
          description: 'سیاست نگهداری جدید با موفقیت ایجاد شد',
        });
      }
      
      setDialogOpen(false);
      setEditingPolicy(null);
      resetForm();
      fetchPolicies();
    } catch (error) {
      console.error('Failed to save retention policy:', error);
      toast({
        title: 'خطا در ذخیره سیاست',
        description: 'امکان ذخیره سیاست نگهداری وجود ندارد',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      backup_type: policy.backup_type,
      retention_days: policy.retention_days,
      max_backups_per_tenant: policy.max_backups_per_tenant || 10,
      auto_cleanup_enabled: policy.auto_cleanup_enabled,
      storage_providers: policy.storage_providers,
      is_active: policy.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm('آیا از حذف این سیاست اطمینان دارید؟')) return;

    try {
      await backupMonitoringService.deleteRetentionPolicy(policyId);
      toast({
        title: 'سیاست حذف شد',
        description: 'سیاست نگهداری با موفقیت حذف شد',
      });
      fetchPolicies();
    } catch (error) {
      console.error('Failed to delete retention policy:', error);
      toast({
        title: 'خطا در حذف سیاست',
        description: 'امکان حذف سیاست نگهداری وجود ندارد',
        variant: 'destructive',
      });
    }
  };

  const handleExecute = async (policyId: string) => {
    if (!confirm('آیا از اجرای این سیاست اطمینان دارید؟ این عمل قابل بازگشت نیست.')) return;

    try {
      const response = await backupMonitoringService.executeRetentionPolicy(policyId);
      toast({
        title: 'اجرای سیاست شروع شد',
        description: response.message,
      });
    } catch (error) {
      console.error('Failed to execute retention policy:', error);
      toast({
        title: 'خطا در اجرای سیاست',
        description: 'امکان اجرای سیاست نگهداری وجود ندارد',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (policyId: string) => {
    try {
      const data = await backupMonitoringService.getRetentionPolicyPreview(policyId);
      setPreviewData(data);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Failed to get retention policy preview:', error);
      toast({
        title: 'خطا در پیش‌نمایش',
        description: 'امکان نمایش پیش‌نمایش سیاست وجود ندارد',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      backup_type: 'tenant',
      retention_days: 30,
      max_backups_per_tenant: 10,
      auto_cleanup_enabled: true,
      storage_providers: ['backblaze_b2'],
      is_active: true,
    });
  };

  const handleStorageProviderChange = (provider: 'backblaze_b2' | 'cloudflare_r2', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      storage_providers: checked
        ? [...prev.storage_providers, provider]
        : prev.storage_providers.filter(p => p !== provider)
    }));
  };

  const getBackupTypeBadge = (type: string) => {
    return type === 'tenant' ? (
      <Badge className="bg-blue-100 text-blue-700">تنانت</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-700">بازیابی فاجعه</Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-700">فعال</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700">غیرفعال</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">مدیریت سیاست‌های نگهداری</h2>
                <p className="text-sm text-slate-600">
                  تنظیم و مدیریت سیاست‌های خودکار پاکسازی پشتیبان‌ها
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="gradient-purple"
                  className="flex items-center gap-2"
                  onClick={() => {
                    setEditingPolicy(null);
                    resetForm();
                  }}
                >
                  <PlusIcon className="w-4 h-4" />
                  سیاست جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPolicy ? 'ویرایش سیاست نگهداری' : 'ایجاد سیاست نگهداری جدید'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">نام سیاست</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="نام سیاست را وارد کنید"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backup_type">نوع پشتیبان</Label>
                      <Select
                        value={formData.backup_type}
                        onValueChange={(value: 'tenant' | 'disaster_recovery') => 
                          setFormData(prev => ({ ...prev, backup_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant">پشتیبان تنانت</SelectItem>
                          <SelectItem value="disaster_recovery">بازیابی فاجعه</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retention_days">مدت نگهداری (روز)</Label>
                      <Input
                        id="retention_days"
                        type="number"
                        min="1"
                        value={formData.retention_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))}
                        required
                      />
                    </div>

                    {formData.backup_type === 'tenant' && (
                      <div className="space-y-2">
                        <Label htmlFor="max_backups">حداکثر پشتیبان هر تنانت</Label>
                        <Input
                          id="max_backups"
                          type="number"
                          min="1"
                          value={formData.max_backups_per_tenant}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_backups_per_tenant: parseInt(e.target.value) }))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label>ارائه‌دهندگان ذخیره‌سازی</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="backblaze_b2"
                          checked={formData.storage_providers.includes('backblaze_b2')}
                          onCheckedChange={(checked) => handleStorageProviderChange('backblaze_b2', checked as boolean)}
                        />
                        <Label htmlFor="backblaze_b2">Backblaze B2</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cloudflare_r2"
                          checked={formData.storage_providers.includes('cloudflare_r2')}
                          onCheckedChange={(checked) => handleStorageProviderChange('cloudflare_r2', checked as boolean)}
                        />
                        <Label htmlFor="cloudflare_r2">Cloudflare R2</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto_cleanup"
                        checked={formData.auto_cleanup_enabled}
                        onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, auto_cleanup_enabled: checked }))}
                      />
                      <Label htmlFor="auto_cleanup">پاکسازی خودکار فعال</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">سیاست فعال</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      انصراف
                    </Button>
                    <Button type="submit" variant="gradient-purple">
                      {editingPolicy ? 'بروزرسانی' : 'ایجاد'} سیاست
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Policies List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} variant="professional">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : policies.length === 0 ? (
          <Card variant="professional">
            <CardContent className="p-8 text-center">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">هیچ سیاست نگهداری تعریف نشده است</p>
            </CardContent>
          </Card>
        ) : (
          policies.map((policy) => (
            <Card key={policy.id} variant="professional">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">{policy.name}</h3>
                      {getBackupTypeBadge(policy.backup_type)}
                      {getStatusBadge(policy.is_active)}
                      {policy.auto_cleanup_enabled && (
                        <Badge className="bg-orange-100 text-orange-700">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          خودکار
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">مدت نگهداری:</span>
                        <span className="font-medium mr-2">{policy.retention_days} روز</span>
                      </div>
                      {policy.max_backups_per_tenant && (
                        <div>
                          <span className="text-slate-600">حداکثر پشتیبان:</span>
                          <span className="font-medium mr-2">{policy.max_backups_per_tenant}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">ارائه‌دهندگان:</span>
                        <div className="flex gap-1 mt-1">
                          {policy.storage_providers.map(provider => (
                            <Badge
                              key={provider}
                              className={
                                provider === 'backblaze_b2'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }
                            >
                              {provider === 'backblaze_b2' ? 'B2' : 'R2'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                      <span>ایجاد: {new Date(policy.created_at).toLocaleDateString('fa-IR')}</span>
                      <span>بروزرسانی: {new Date(policy.updated_at).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(policy.id)}
                      className="flex items-center gap-1"
                    >
                      <EyeIcon className="w-4 h-4" />
                      پیش‌نمایش
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                      className="flex items-center gap-1"
                    >
                      <EditIcon className="w-4 h-4" />
                      ویرایش
                    </Button>
                    <Button
                      variant="gradient-green"
                      size="sm"
                      onClick={() => handleExecute(policy.id)}
                      disabled={!policy.is_active}
                      className="flex items-center gap-1"
                    >
                      <PlayIcon className="w-4 h-4" />
                      اجرا
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>پیش‌نمایش اجرای سیاست نگهداری</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="gradient-red">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {previewData.total_files}
                    </div>
                    <p className="text-sm text-red-600">فایل برای حذف</p>
                  </CardContent>
                </Card>
                <Card variant="gradient-blue">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {previewData.total_size_gb.toFixed(2)} GB
                    </div>
                    <p className="text-sm text-blue-600">حجم آزادسازی</p>
                  </CardContent>
                </Card>
                <Card variant="gradient-green">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      ${previewData.estimated_savings.toFixed(2)}
                    </div>
                    <p className="text-sm text-green-600">صرفه‌جویی ماهانه</p>
                  </CardContent>
                </Card>
              </div>

              {/* Files to Delete */}
              <Card variant="professional">
                <CardHeader>
                  <CardTitle>فایل‌های برای حذف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b">
                        <tr>
                          <th className="text-right p-2">تنانت</th>
                          <th className="text-right p-2">شناسه پشتیبان</th>
                          <th className="text-right p-2">اندازه</th>
                          <th className="text-right p-2">سن (روز)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.files_to_delete.map((file: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-2">{file.tenant_name}</td>
                            <td className="p-2 font-mono text-xs">{file.backup_id}</td>
                            <td className="p-2">{(file.file_size / 1024 / 1024).toFixed(2)} MB</td>
                            <td className="p-2">{file.age_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setPreviewDialogOpen(false)}
                >
                  بستن
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetentionPolicyManagement;
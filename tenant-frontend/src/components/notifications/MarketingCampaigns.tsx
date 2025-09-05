import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { notificationService, MarketingCampaign, CustomerSegment } from '@/services/notificationService';
import { 
  Megaphone, Plus, Edit, Trash2, Send, Users, Target, 
  Calendar, CheckCircle, XCircle, Clock, Search, RefreshCw 
} from 'lucide-react';

const MarketingCampaignsComponent: React.FC = () => {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignForm, setCampaignForm] = useState<Partial<MarketingCampaign>>({
    name: '',
    message: '',
    notification_type: 'sms',
    target_segments: [],
    customer_tags: [],
    status: 'draft',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsData, segmentsData, tagsData] = await Promise.all([
        notificationService.getMarketingCampaigns(),
        notificationService.getCustomerSegments(),
        notificationService.getCustomerTags(),
      ]);
      setCampaigns(campaignsData.campaigns);
      setSegments(segmentsData);
      setCustomerTags(tagsData);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری اطلاعات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openCreateDialog = () => {
    setEditingCampaign(null);
    setCampaignForm({
      name: '',
      message: '',
      notification_type: 'sms',
      target_segments: [],
      customer_tags: [],
      status: 'draft',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      message: campaign.message,
      notification_type: campaign.notification_type,
      target_segments: campaign.target_segments,
      customer_tags: campaign.customer_tags,
      status: campaign.status,
      scheduled_at: campaign.scheduled_at,
    });
    setDialogOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.message) {
      toast({
        title: 'خطا',
        description: 'لطفاً نام و متن کمپین را وارد کنید',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingCampaign) {
        await notificationService.updateMarketingCampaign(editingCampaign.id!, campaignForm);
        toast({
          title: 'موفقیت',
          description: 'کمپین با موفقیت به‌روزرسانی شد',
        });
      } else {
        await notificationService.createMarketingCampaign(campaignForm as Omit<MarketingCampaign, 'id' | 'tenant_id' | 'created_at'>);
        toast({
          title: 'موفقیت',
          description: 'کمپین با موفقیت ایجاد شد',
        });
      }
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره کمپین',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('آیا از حذف این کمپین اطمینان دارید؟')) return;

    try {
      await notificationService.deleteMarketingCampaign(id);
      toast({
        title: 'موفقیت',
        description: 'کمپین با موفقیت حذف شد',
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در حذف کمپین',
        variant: 'destructive',
      });
    }
  };

  const handleSendCampaign = async (id: string) => {
    if (!confirm('آیا از ارسال این کمپین اطمینان دارید؟')) return;

    try {
      const result = await notificationService.sendMarketingCampaign(id);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'کمپین با موفقیت ارسال شد',
        });
        await loadData();
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در ارسال کمپین',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ارسال کمپین',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            ارسال شده
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            ناموفق
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <Calendar className="h-3 w-3 mr-1" />
            زمان‌بندی شده
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            پیش‌نویس
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      campaign.name.toLowerCase().includes(searchLower) ||
      campaign.message.toLowerCase().includes(searchLower)
    );
  });

  const handleSegmentChange = (segmentId: string, checked: boolean) => {
    setCampaignForm(prev => ({
      ...prev,
      target_segments: checked
        ? [...(prev.target_segments || []), segmentId]
        : (prev.target_segments || []).filter(id => id !== segmentId)
    }));
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setCampaignForm(prev => ({
      ...prev,
      customer_tags: checked
        ? [...(prev.customer_tags || []), tag]
        : (prev.customer_tags || []).filter(t => t !== tag)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            کمپین‌های بازاریابی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در کمپین‌ها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3"
              aria-label="بروزرسانی"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="gradient-purple"
              onClick={openCreateDialog}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              کمپین جدید
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card variant="professional">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" data-testid="loading-spinner"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام کمپین</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>مخاطبان</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>تاریخ ایجاد</TableHead>
                    <TableHead>آمار</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'هیچ کمپینی یافت نشد' : 'هنوز کمپینی ایجاد نشده است'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {campaign.message}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {campaign.notification_type === 'email' ? 'ایمیل' : 
                             campaign.notification_type === 'sms' ? 'پیامک' : 'ایمیل و پیامک'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">
                              {campaign.total_recipients || 0} نفر
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(campaign.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign.status === 'sent' && (
                            <div className="text-sm space-y-1">
                              <div className="text-green-600">
                                ارسال شده: {campaign.sent_count || 0}
                              </div>
                              {(campaign.failed_count || 0) > 0 && (
                                <div className="text-red-600">
                                  ناموفق: {campaign.failed_count}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(campaign)}
                              disabled={campaign.status === 'sent'}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {campaign.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendCampaign(campaign.id!)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCampaign(campaign.id!)}
                              disabled={campaign.status === 'sent'}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'ویرایش کمپین' : 'ایجاد کمپین جدید'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaign-name">نام کمپین</Label>
                <Input
                  id="campaign-name"
                  value={campaignForm.name || ''}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="نام کمپین را وارد کنید"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notification-type">نوع اعلان</Label>
                <Select
                  value={campaignForm.notification_type}
                  onValueChange={(value: 'email' | 'sms' | 'both') => 
                    setCampaignForm(prev => ({ ...prev, notification_type: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">ایمیل</SelectItem>
                    <SelectItem value="sms">پیامک</SelectItem>
                    <SelectItem value="both">ایمیل و پیامک</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="campaign-message">متن پیام</Label>
              <Textarea
                id="campaign-message"
                value={campaignForm.message || ''}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                placeholder="متن پیام کمپین را وارد کنید"
                className="mt-1"
              />
            </div>

            {/* Target Segments */}
            <div>
              <Label>گروه‌های هدف</Label>
              <Card variant="gradient-blue" className="mt-2">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {segments.map((segment) => (
                      <div key={segment.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`segment-${segment.id}`}
                          checked={(campaignForm.target_segments || []).includes(segment.id)}
                          onCheckedChange={(checked) => handleSegmentChange(segment.id, checked as boolean)}
                        />
                        <Label htmlFor={`segment-${segment.id}`} className="flex-1">
                          <div>
                            <div className="font-medium">{segment.name}</div>
                            <div className="text-sm text-gray-500">
                              {segment.customer_count} مشتری - {segment.description}
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Tags */}
            <div>
              <Label>برچسب‌های مشتری</Label>
              <Card variant="gradient-green" className="mt-2">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {customerTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={(campaignForm.customer_tags || []).includes(tag)}
                          onCheckedChange={(checked) => handleTagChange(tag, checked as boolean)}
                        />
                        <Label htmlFor={`tag-${tag}`} className="flex-1">
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule */}
            <div>
              <Label htmlFor="scheduled-at">زمان‌بندی ارسال (اختیاری)</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={campaignForm.scheduled_at || ''}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                انصراف
              </Button>
              <Button
                variant="gradient-purple"
                onClick={handleSaveCampaign}
                disabled={saving || !campaignForm.name || !campaignForm.message}
              >
                {saving ? 'در حال ذخیره...' : (editingCampaign ? 'به‌روزرسانی' : 'ایجاد کمپین')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingCampaignsComponent;
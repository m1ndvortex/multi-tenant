import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Webhook, 
  Plus, 
  Copy, 
  Trash2, 
  TestTube,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Settings
} from 'lucide-react';
import { apiAccessService, WebhookEndpoint, WebhookCreateRequest } from '@/services/apiAccessService';
import { useToast } from '@/hooks/use-toast';

const WebhookManagement: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiAccessService.getWebhooks(),
  });

  const { data: availableEvents } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => apiAccessService.getAvailableWebhookEvents(),
  });

  const createWebhookMutation = useMutation({
    mutationFn: (request: WebhookCreateRequest) => apiAccessService.createWebhook(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setShowCreateDialog(false);
      toast({
        title: 'وب‌هوک ایجاد شد',
        description: 'وب‌هوک جدید با موفقیت ایجاد شد.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در ایجاد وب‌هوک',
        description: error.message || 'خطایی در ایجاد وب‌هوک رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (webhookId: string) => apiAccessService.deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'وب‌هوک حذف شد',
        description: 'وب‌هوک با موفقیت حذف شد.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در حذف وب‌هوک',
        description: error.message || 'خطایی در حذف وب‌هوک رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: (webhookId: string) => apiAccessService.testWebhook(webhookId),
    onSuccess: (result, webhookId) => {
      setTestingWebhook(null);
      if (result.success) {
        toast({
          title: 'تست وب‌هوک موفق',
          description: 'وب‌هوک با موفقیت تست شد.',
        });
      } else {
        toast({
          title: 'تست وب‌هوک ناموفق',
          description: result.error || 'خطایی در تست وب‌هوک رخ داد.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setTestingWebhook(null);
      toast({
        title: 'خطا در تست وب‌هوک',
        description: error.message || 'خطایی در تست وب‌هوک رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'کپی شد',
        description: 'رمز وب‌هوک در کلیپ‌بورد کپی شد.',
      });
    } catch (error) {
      toast({
        title: 'خطا در کپی',
        description: 'امکان کپی کردن وجود ندارد.',
        variant: 'destructive',
      });
    }
  };

  const handleTestWebhook = (webhookId: string) => {
    setTestingWebhook(webhookId);
    testWebhookMutation.mutate(webhookId);
  };

  const getStatusBadge = (webhook: WebhookEndpoint) => {
    if (!webhook.is_active) {
      return <Badge variant="secondary">غیرفعال</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">فعال</Badge>;
  };

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
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
          <h2 className="text-xl font-semibold text-gray-900">وب‌هوک‌ها</h2>
          <p className="text-sm text-gray-600 mt-1">مدیریت اعلان‌های خودکار رویدادها</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="gradient-indigo">
              <Plus className="h-4 w-4 ml-2" />
              وب‌هوک جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ایجاد وب‌هوک جدید</DialogTitle>
            </DialogHeader>
            <CreateWebhookForm 
              onSubmit={(data) => createWebhookMutation.mutate(data)}
              availableEvents={availableEvents || []}
              isLoading={createWebhookMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card variant="gradient-blue">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Webhook className="h-4 w-4 text-gray-700" />
            </div>
            <div className="text-sm">
              <h4 className="font-medium text-gray-900 mb-1">وب‌هوک‌ها چیست؟</h4>
              <p className="text-gray-700">
                وب‌هوک‌ها به شما امکان دریافت اعلان‌های خودکار هنگام وقوع رویدادهای مختلف در سیستم را می‌دهند.
                مثل ایجاد فاکتور جدید، پرداخت، یا تغییر وضعیت مشتری.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks List */}
      {!webhooks || webhooks.length === 0 ? (
        <Card variant="professional">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <Webhook className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">هنوز وب‌هوک ایجاد نکرده‌اید</h3>
            <p className="text-gray-600 mb-6">
              برای دریافت اعلان‌های خودکار رویدادها، اولین وب‌هوک خود را ایجاد کنید.
            </p>
            <Button 
              variant="gradient-indigo" 
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 ml-2" />
              ایجاد اولین وب‌هوک
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} variant="professional">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Webhook className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                            {webhook.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(webhook.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(webhook)}
                          {webhook.last_triggered_at && (
                            <Badge variant="outline" className="text-xs">
                              <Activity className="h-3 w-3 ml-1" />
                              آخرین فراخوانی: {new Date(webhook.last_triggered_at).toLocaleDateString('fa-IR')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Events */}
                    <div className="mb-3">
                      <Label className="text-xs text-gray-600 mb-2 block">رویدادها:</Label>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Secret */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs text-gray-600">رمز وب‌هوک:</Label>
                          <code className="text-sm font-mono text-gray-800 block">
                            {webhook.secret.substring(0, 16)}••••••••••••••••
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(webhook.secret)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        ایجاد: {new Date(webhook.created_at).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={testingWebhook === webhook.id}
                    >
                      {testingWebhook === webhook.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                      disabled={deleteWebhookMutation.isPending}
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

// Create Webhook Form Component
interface CreateWebhookFormProps {
  onSubmit: (data: WebhookCreateRequest) => void;
  availableEvents: Array<{ key: string; name: string; description: string }>;
  isLoading: boolean;
}

const CreateWebhookForm: React.FC<CreateWebhookFormProps> = ({ 
  onSubmit, 
  availableEvents, 
  isLoading 
}) => {
  const [formData, setFormData] = useState<WebhookCreateRequest>({
    url: '',
    events: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleEventChange = (event: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        events: [...prev.events, event]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        events: prev.events.filter(e => e !== event)
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="url">URL وب‌هوک</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          placeholder="https://example.com/webhook"
          required
        />
        <p className="text-xs text-gray-600 mt-1">
          URL که رویدادها به آن ارسال می‌شوند
        </p>
      </div>

      <div>
        <Label>رویدادها</Label>
        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
          {availableEvents.map((event) => (
            <div key={event.key} className="flex items-start space-x-2 space-x-reverse">
              <Checkbox
                id={event.key}
                checked={formData.events.includes(event.key)}
                onCheckedChange={(checked) => 
                  handleEventChange(event.key, checked as boolean)
                }
              />
              <div className="flex-1">
                <Label htmlFor={event.key} className="text-sm font-medium">
                  {event.name}
                </Label>
                <p className="text-xs text-gray-600">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading || !formData.url || formData.events.length === 0}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              در حال ایجاد...
            </>
          ) : (
            <>
              <Webhook className="h-4 w-4 ml-2" />
              ایجاد وب‌هوک
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default WebhookManagement;
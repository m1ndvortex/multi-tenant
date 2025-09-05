import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Share2, BarChart3, Settings } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { SharingControls } from './SharingControls';
import { qrSharingService } from '@/services/qrSharingService';

interface InvoiceSharingProps {
  invoiceId: string;
  invoiceNumber: string;
  initialIsShareable?: boolean;
  initialQrToken?: string;
  onSharingChange?: (isShareable: boolean, qrToken?: string) => void;
}

export const InvoiceSharing: React.FC<InvoiceSharingProps> = ({
  invoiceId,
  invoiceNumber,
  initialIsShareable = false,
  initialQrToken,
  onSharingChange
}) => {
  const { toast } = useToast();
  const [isShareable, setIsShareable] = useState(initialIsShareable);
  const [qrToken, setQrToken] = useState(initialQrToken);
  const [activeTab, setActiveTab] = useState('qr-code');

  useEffect(() => {
    setIsShareable(initialIsShareable);
    setQrToken(initialQrToken);
  }, [initialIsShareable, initialQrToken]);

  const handleSharingToggle = async (enabled: boolean) => {
    try {
      const response = await qrSharingService.updateSharingSettings(invoiceId, {
        is_shareable: enabled,
        regenerate_token: false
      });

      setIsShareable(enabled);
      setQrToken(response.qr_token);

      // Notify parent component
      if (onSharingChange) {
        onSharingChange(enabled, response.qr_token);
      }

      toast({
        title: 'موفق',
        description: enabled ? 'اشتراک‌گذاری فعال شد' : 'اشتراک‌گذاری غیرفعال شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در تغییر تنظیمات اشتراک‌گذاری',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-6 w-6" />
            اشتراک‌گذاری و کد QR فاکتور {invoiceNumber}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr-code" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            کد QR و تنظیمات
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            آمار و مدیریت
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr-code" className="space-y-6">
          <QRCodeDisplay
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            isShareable={isShareable}
            qrToken={qrToken}
            onSharingToggle={handleSharingToggle}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <SharingControls
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            isShareable={isShareable}
            qrToken={qrToken}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {isShareable && qrToken && (
        <Card variant="filter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                لینک عمومی: {qrSharingService.getPublicInvoiceUrl(qrToken)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrSharingService.getPublicInvoiceUrl(qrToken));
                    toast({ title: 'موفق', description: 'لینک کپی شد' });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  کپی لینک
                </button>
                <button
                  onClick={() => window.open(qrSharingService.getPublicInvoiceUrl(qrToken), '_blank')}
                  className="text-xs text-green-600 hover:text-green-800 underline"
                >
                  مشاهده عمومی
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
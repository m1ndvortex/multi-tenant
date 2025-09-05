import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  Download, 
  Copy, 
  Share2, 
  RefreshCw, 
  Eye,
  EyeOff,
  ExternalLink,
  FileText
} from 'lucide-react';
import { qrSharingService, QRCodeResponse } from '@/services/qrSharingService';

interface QRCodeDisplayProps {
  invoiceId: string;
  invoiceNumber: string;
  isShareable: boolean;
  qrToken?: string;
  onSharingToggle: (enabled: boolean) => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  invoiceId,
  invoiceNumber,
  isShareable,
  qrToken,
  onSharingToggle
}) => {
  const { toast } = useToast();
  const [qrData, setQrData] = useState<QRCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrSize, setQrSize] = useState(10);
  const [qrFormat, setQrFormat] = useState<'PNG' | 'JPEG' | 'SVG'>('PNG');

  useEffect(() => {
    if (isShareable && qrToken) {
      loadQRCode();
    }
  }, [isShareable, qrToken]);

  const loadQRCode = async () => {
    if (!isShareable) return;
    
    setLoading(true);
    try {
      const response = await qrSharingService.generateQRCode(invoiceId, {
        regenerate: false,
        size: qrSize,
        format: qrFormat
      });
      setQrData(response);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری کد QR',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSharingToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      await qrSharingService.updateSharingSettings(invoiceId, {
        is_shareable: enabled,
        regenerate_token: false
      });
      onSharingToggle(enabled);
      
      if (enabled) {
        await loadQRCode();
      } else {
        setQrData(null);
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
    } finally {
      setLoading(false);
    }
  };

  const regenerateQRCode = async () => {
    setLoading(true);
    try {
      const response = await qrSharingService.generateQRCode(invoiceId, {
        regenerate: true,
        size: qrSize,
        format: qrFormat
      });
      setQrData(response);
      
      toast({
        title: 'موفق',
        description: 'کد QR جدید تولید شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در تولید کد QR جدید',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!qrData) return;
    
    const publicUrl = qrSharingService.getPublicInvoiceUrl(qrData.qr_token);
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'موفق',
        description: 'لینک عمومی کپی شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در کپی کردن لینک',
        variant: 'destructive',
      });
    }
  };

  const downloadQRCode = async () => {
    if (!qrData) return;
    
    try {
      const blob = await qrSharingService.getQRCodeImage(invoiceId, qrFormat, qrSize);
      qrSharingService.downloadBlob(blob, `qr_code_${invoiceNumber}.${qrFormat.toLowerCase()}`);
      
      toast({
        title: 'موفق',
        description: 'کد QR دانلود شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در دانلود کد QR',
        variant: 'destructive',
      });
    }
  };

  const downloadPDF = async () => {
    try {
      const blob = await qrSharingService.generateInvoicePDF(invoiceId, true);
      qrSharingService.downloadBlob(blob, `invoice_${invoiceNumber}_with_qr.pdf`);
      
      toast({
        title: 'موفق',
        description: 'فاکتور با کد QR دانلود شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در دانلود فاکتور',
        variant: 'destructive',
      });
    }
  };

  const openPublicView = () => {
    if (!qrData) return;
    
    const publicUrl = qrSharingService.getPublicInvoiceUrl(qrData.qr_token);
    window.open(publicUrl, '_blank');
  };

  return (
    <Card variant="professional" className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          کد QR و اشتراک‌گذاری فاکتور
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sharing Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">اشتراک‌گذاری عمومی</Label>
            <p className="text-xs text-muted-foreground">
              امکان مشاهده فاکتور بدون نیاز به ورود
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isShareable ? "default" : "secondary"}>
              {isShareable ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  فعال
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  غیرفعال
                </>
              )}
            </Badge>
            <Switch
              checked={isShareable}
              onCheckedChange={handleSharingToggle}
              disabled={loading}
            />
          </div>
        </div>

        {isShareable && (
          <>
            <Separator />
            
            {/* QR Code Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qr-size">اندازه کد QR</Label>
                <Input
                  id="qr-size"
                  type="number"
                  min="5"
                  max="20"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value))}
                  className="text-center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-format">فرمت تصویر</Label>
                <select
                  id="qr-format"
                  value={qrFormat}
                  onChange={(e) => setQrFormat(e.target.value as 'PNG' | 'JPEG' | 'SVG')}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="PNG">PNG</option>
                  <option value="JPEG">JPEG</option>
                  <option value="SVG">SVG</option>
                </select>
              </div>
            </div>

            {/* QR Code Display */}
            {qrData && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    {qrData.qr_base64 ? (
                      <img
                        src={qrData.qr_base64}
                        alt={`QR Code for ${invoiceNumber}`}
                        className="w-48 h-48 object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                        <QrCode className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Public URL */}
                <div className="space-y-2">
                  <Label>لینک عمومی فاکتور</Label>
                  <div className="flex gap-2">
                    <Input
                      value={qrSharingService.getPublicInvoiceUrl(qrData.qr_token)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPublicUrl}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={regenerateQRCode}
                    disabled={loading}
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    تولید مجدد
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadQRCode}
                    disabled={loading}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    دانلود QR
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openPublicView}
                    disabled={loading}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    مشاهده عمومی
                  </Button>
                  <Button
                    variant="gradient-green"
                    onClick={downloadPDF}
                    disabled={loading}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    دانلود PDF
                  </Button>
                </div>
              </div>
            )}

            {!qrData && !loading && (
              <div className="text-center py-8">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  کد QR هنوز تولید نشده است
                </p>
                <Button onClick={loadQRCode} variant="gradient-green">
                  تولید کد QR
                </Button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  در حال پردازش...
                </p>
              </div>
            )}
          </>
        )}

        {!isShareable && (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              برای استفاده از کد QR، اشتراک‌گذاری را فعال کنید
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  invoiceCustomizationService, 
  InvoiceNumberingScheme, 
  CreateInvoiceNumberingScheme,
  InvoiceNumberPreviewResponse
} from '@/services/invoiceCustomizationService';
import { 
  Hash, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Loader2,
  Eye,
  RefreshCw,
  Calendar,
  Settings
} from 'lucide-react';

const NumberingSchemeManager: React.FC = () => {
  const [numberingSchemes, setNumberingSchemes] = useState<InvoiceNumberingScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<InvoiceNumberingScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceNumberPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing numbering schemes
  const [formData, setFormData] = useState<CreateInvoiceNumberingScheme>({
    name: '',
    description: '',
    prefix: '',
    suffix: '',
    number_format: '{prefix}{year}{month:02d}{sequence:04d}{suffix}',
    current_sequence: 1,
    sequence_reset_frequency: 'NEVER',
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    loadNumberingSchemes();
  }, []);

  const loadNumberingSchemes = async () => {
    try {
      const response = await invoiceCustomizationService.getNumberingSchemes();
      setNumberingSchemes(response.numbering_schemes);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری طرح‌های شماره‌گذاری',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScheme = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'خطا',
        description: 'نام طرح شماره‌گذاری الزامی است',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const newScheme = await invoiceCustomizationService.createNumberingScheme(formData);
      setNumberingSchemes([...numberingSchemes, newScheme]);
      setShowCreateForm(false);
      resetForm();
      
      toast({
        title: 'موفقیت',
        description: 'طرح شماره‌گذاری جدید با موفقیت ایجاد شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد طرح شماره‌گذاری',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewNumbers = async (schemeId: string, count: number = 5) => {
    setPreviewLoading(true);
    try {
      const preview = await invoiceCustomizationService.previewInvoiceNumbers(schemeId, count);
      setPreviewData(preview);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در پیش‌نمایش شماره‌ها',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectScheme = (scheme: InvoiceNumberingScheme) => {
    setSelectedScheme(scheme);
    setFormData({
      name: scheme.name,
      description: scheme.description || '',
      prefix: scheme.prefix || '',
      suffix: scheme.suffix || '',
      number_format: scheme.number_format,
      current_sequence: scheme.current_sequence,
      sequence_reset_frequency: scheme.sequence_reset_frequency,
      is_active: scheme.is_active,
      is_default: scheme.is_default,
    });
    
    // Load preview for selected scheme
    handlePreviewNumbers(scheme.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prefix: '',
      suffix: '',
      number_format: '{prefix}{year}{month:02d}{sequence:04d}{suffix}',
      current_sequence: 1,
      sequence_reset_frequency: 'NEVER',
      is_active: true,
      is_default: false,
    });
    setPreviewData(null);
  };

  const updateField = (field: keyof CreateInvoiceNumberingScheme, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const getResetFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'NEVER': return 'هرگز';
      case 'YEARLY': return 'سالانه';
      case 'MONTHLY': return 'ماهانه';
      case 'DAILY': return 'روزانه';
      default: return frequency;
    }
  };

  const getResetFrequencyBadgeVariant = (frequency: string) => {
    switch (frequency) {
      case 'NEVER': return 'default';
      case 'YEARLY': return 'secondary';
      case 'MONTHLY': return 'outline';
      case 'DAILY': return 'destructive';
      default: return 'default';
    }
  };

  // Format variables explanation
  const formatVariables = [
    { variable: '{prefix}', description: 'پیشوند' },
    { variable: '{suffix}', description: 'پسوند' },
    { variable: '{year}', description: 'سال (مثال: 2024)' },
    { variable: '{month}', description: 'ماه (مثال: 3)' },
    { variable: '{month:02d}', description: 'ماه با صفر (مثال: 03)' },
    { variable: '{day}', description: 'روز (مثال: 15)' },
    { variable: '{day:02d}', description: 'روز با صفر (مثال: 15)' },
    { variable: '{sequence}', description: 'شماره ترتیبی (مثال: 1)' },
    { variable: '{sequence:04d}', description: 'شماره ترتیبی با صفر (مثال: 0001)' },
  ];

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Numbering Schemes List */}
      <div className="lg:col-span-1 space-y-4">
        <Card variant="gradient-indigo">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                طرح‌های شماره‌گذاری
              </CardTitle>
              <Button
                variant="gradient-purple"
                size="sm"
                onClick={() => {
                  setShowCreateForm(true);
                  setSelectedScheme(null);
                  resetForm();
                }}
              >
                <Plus className="h-4 w-4 ml-1" />
                جدید
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {numberingSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedScheme?.id === scheme.id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
                onClick={() => selectScheme(scheme)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{scheme.name}</h3>
                    {scheme.description && (
                      <p className="text-sm text-gray-600 mt-1">{scheme.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {scheme.is_default && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                </div>
                
                {/* Format Preview */}
                <div className="mb-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {scheme.number_format}
                  </code>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant={getResetFrequencyBadgeVariant(scheme.sequence_reset_frequency)}>
                    <RefreshCw className="h-3 w-3 ml-1" />
                    {getResetFrequencyLabel(scheme.sequence_reset_frequency)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>شماره فعلی: {scheme.current_sequence}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {scheme.is_active ? (
                      <span className="text-green-600">فعال</span>
                    ) : (
                      <span className="text-red-600">غیرفعال</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {numberingSchemes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Hash className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">هیچ طرحی یافت نشد</p>
                <p className="text-sm">اولین طرح شماره‌گذاری خود را ایجاد کنید</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheme Editor */}
      <div className="lg:col-span-2 space-y-4">
        {(selectedScheme || showCreateForm) ? (
          <>
            {/* Scheme Form */}
            <Card variant="professional">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Hash className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>
                        {selectedScheme ? 'ویرایش طرح شماره‌گذاری' : 'ایجاد طرح جدید'}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        تنظیم قالب و قوانین شماره‌گذاری فاکتورها
                      </p>
                    </div>
                  </div>
                  {selectedScheme?.is_default && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 ml-1 fill-current" />
                      پیش‌فرض
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    اطلاعات پایه
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheme-name">نام طرح *</Label>
                      <Input
                        id="scheme-name"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="نام طرح شماره‌گذاری"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-sequence">شماره فعلی</Label>
                      <Input
                        id="current-sequence"
                        type="number"
                        min="1"
                        value={formData.current_sequence}
                        onChange={(e) => updateField('current_sequence', parseInt(e.target.value) || 1)}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheme-description">توضیحات</Label>
                    <Textarea
                      id="scheme-description"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="توضیحات طرح شماره‌گذاری"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Format Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">قالب شماره‌گذاری</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prefix">پیشوند</Label>
                      <Input
                        id="prefix"
                        value={formData.prefix}
                        onChange={(e) => updateField('prefix', e.target.value)}
                        placeholder="مثال: INV-"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="suffix">پسوند</Label>
                      <Input
                        id="suffix"
                        value={formData.suffix}
                        onChange={(e) => updateField('suffix', e.target.value)}
                        placeholder="مثال: -IR"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number-format">قالب شماره</Label>
                    <Input
                      id="number-format"
                      value={formData.number_format}
                      onChange={(e) => updateField('number_format', e.target.value)}
                      placeholder="{prefix}{year}{month:02d}{sequence:04d}{suffix}"
                      dir="ltr"
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500">
                      از متغیرهای زیر برای ساخت قالب استفاده کنید
                    </p>
                  </div>

                  {/* Format Variables Help */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">متغیرهای قابل استفاده:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {formatVariables.map((variable, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded text-xs font-mono">
                            {variable.variable}
                          </code>
                          <span className="text-gray-600">{variable.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reset Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    تنظیمات بازنشانی
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reset-frequency">دوره بازنشانی شماره</Label>
                    <Select
                      value={formData.sequence_reset_frequency}
                      onValueChange={(value: any) => updateField('sequence_reset_frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEVER">هرگز</SelectItem>
                        <SelectItem value="YEARLY">سالانه</SelectItem>
                        <SelectItem value="MONTHLY">ماهانه</SelectItem>
                        <SelectItem value="DAILY">روزانه</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      تعیین می‌کند که شماره ترتیبی چه زمانی به 1 بازگردد
                    </p>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is-active"
                        checked={formData.is_active}
                        onChange={(e) => updateField('is_active', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="is-active">فعال</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is-default"
                        checked={formData.is_default}
                        onChange={(e) => updateField('is_default', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="is-default">پیش‌فرض</Label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedScheme(null);
                      resetForm();
                    }}
                  >
                    انصراف
                  </Button>
                  <Button
                    variant="gradient-indigo"
                    onClick={handleCreateScheme}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        در حال ذخیره...
                      </>
                    ) : (
                      selectedScheme ? 'به‌روزرسانی' : 'ایجاد'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {selectedScheme && (
              <Card variant="gradient-green">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      پیش‌نمایش شماره‌ها
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewNumbers(selectedScheme.id, 5)}
                      disabled={previewLoading}
                    >
                      {previewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 ml-1" />
                      )}
                      به‌روزرسانی
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {previewData ? (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>طرح: <strong>{previewData.scheme_name}</strong></p>
                        <p>شماره فعلی: <strong>{previewData.current_sequence}</strong></p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">شماره‌های بعدی:</h4>
                        <div className="space-y-2">
                          {previewData.preview_numbers.map((number, index) => (
                            <div
                              key={index}
                              className="p-3 bg-white rounded-lg border font-mono text-lg"
                            >
                              {number}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        شماره بعدی پس از استفاده: <strong>{previewData.next_sequence}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>پیش‌نمایش در حال بارگذاری...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card variant="professional">
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <Hash className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">طرحی انتخاب نشده</h3>
                <p className="text-sm">
                  برای شروع، یک طرح شماره‌گذاری از فهرست سمت راست انتخاب کنید یا یکی جدید ایجاد کنید
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NumberingSchemeManager;
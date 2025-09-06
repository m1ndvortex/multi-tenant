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
  InvoiceTemplate, 
  CreateInvoiceTemplate,
  InvoiceTemplateWithFields 
} from '@/services/invoiceCustomizationService';
import { 
  Layout, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Star, 
  StarOff, 
  Loader2,
  GripVertical,
  Eye,
  Settings
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface LayoutElement {
  id: string;
  type: 'header' | 'customer_info' | 'invoice_details' | 'items_table' | 'totals' | 'footer' | 'custom';
  label: string;
  enabled: boolean;
  config?: any;
}

const defaultLayoutElements: LayoutElement[] = [
  { id: 'header', type: 'header', label: 'سربرگ فاکتور', enabled: true },
  { id: 'customer_info', type: 'customer_info', label: 'اطلاعات مشتری', enabled: true },
  { id: 'invoice_details', type: 'invoice_details', label: 'جزئیات فاکتور', enabled: true },
  { id: 'items_table', type: 'items_table', label: 'جدول اقلام', enabled: true },
  { id: 'totals', type: 'totals', label: 'مجموع و محاسبات', enabled: true },
  { id: 'footer', type: 'footer', label: 'پاورقی', enabled: true },
];

const TemplateDesigner: React.FC = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateWithFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [layoutElements, setLayoutElements] = useState<LayoutElement[]>(defaultLayoutElements);
  const { toast } = useToast();

  // Form state for creating/editing templates
  const [formData, setFormData] = useState<CreateInvoiceTemplate>({
    name: '',
    description: '',
    template_type: 'GENERAL',
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await invoiceCustomizationService.getTemplates();
      setTemplates(response.templates);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری قالب‌ها',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const template = await invoiceCustomizationService.getTemplate(templateId);
      setSelectedTemplate(template);
      
      // Load layout configuration if exists
      if (template.layout_config && template.layout_config.elements) {
        setLayoutElements(template.layout_config.elements);
      } else {
        setLayoutElements(defaultLayoutElements);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری قالب',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'خطا',
        description: 'نام قالب الزامی است',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const newTemplate = await invoiceCustomizationService.createTemplate({
        ...formData,
        layout_config: { elements: layoutElements },
      });
      
      setTemplates([...templates, newTemplate]);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        template_type: 'GENERAL',
        is_active: true,
        is_default: false,
      });
      
      toast({
        title: 'موفقیت',
        description: 'قالب جدید با موفقیت ایجاد شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد قالب',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const updatedTemplate = await invoiceCustomizationService.updateTemplate(
        selectedTemplate.id,
        {
          layout_config: { elements: layoutElements },
          header_config: selectedTemplate.header_config,
          footer_config: selectedTemplate.footer_config,
          item_table_config: selectedTemplate.item_table_config,
        }
      );
      
      // Update templates list
      setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
      
      toast({
        title: 'موفقیت',
        description: 'قالب با موفقیت به‌روزرسانی شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در به‌روزرسانی قالب',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('آیا از حذف این قالب اطمینان دارید؟')) return;

    try {
      await invoiceCustomizationService.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
      
      toast({
        title: 'موفقیت',
        description: 'قالب با موفقیت حذف شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در حذف قالب',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(layoutElements);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLayoutElements(items);
  };

  const toggleElementEnabled = (elementId: string) => {
    setLayoutElements(elements =>
      elements.map(el =>
        el.id === elementId ? { ...el, enabled: !el.enabled } : el
      )
    );
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'GENERAL': return 'عمومی';
      case 'GOLD': return 'طلا';
      case 'CUSTOM': return 'سفارشی';
      default: return type;
    }
  };

  const getTemplateTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'GENERAL': return 'default';
      case 'GOLD': return 'secondary';
      case 'CUSTOM': return 'outline';
      default: return 'default';
    }
  };

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
      {/* Templates List */}
      <div className="lg:col-span-1 space-y-4">
        <Card variant="gradient-purple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                قالب‌های فاکتور
              </CardTitle>
              <Button
                variant="gradient-purple"
                size="sm"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4 ml-1" />
                جدید
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
                }`}
                onClick={() => loadTemplate(template.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_default && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={getTemplateTypeBadgeVariant(template.template_type)}>
                    {getTemplateTypeLabel(template.template_type)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {template.is_active ? (
                      <span className="text-green-600">فعال</span>
                    ) : (
                      <span className="text-red-600">غیرفعال</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Layout className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">هیچ قالبی یافت نشد</p>
                <p className="text-sm">اولین قالب خود را ایجاد کنید</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Template Form */}
        {showCreateForm && (
          <Card variant="professional">
            <CardHeader>
              <CardTitle>ایجاد قالب جدید</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">نام قالب *</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="نام قالب را وارد کنید"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">توضیحات</Label>
                <Textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="توضیحات قالب"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-type">نوع قالب</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value: any) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">عمومی</SelectItem>
                    <SelectItem value="GOLD">طلا</SelectItem>
                    <SelectItem value="CUSTOM">سفارشی</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is-default">قالب پیش‌فرض</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="gradient-purple"
                  onClick={handleCreateTemplate}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال ایجاد...
                    </>
                  ) : (
                    'ایجاد قالب'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Designer */}
      <div className="lg:col-span-2 space-y-4">
        {selectedTemplate ? (
          <>
            {/* Template Info */}
            <Card variant="professional">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Layout className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        طراحی چیدمان و ساختار قالب فاکتور
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTemplateTypeBadgeVariant(selectedTemplate.template_type)}>
                      {getTemplateTypeLabel(selectedTemplate.template_type)}
                    </Badge>
                    {selectedTemplate.is_default && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 ml-1 fill-current" />
                        پیش‌فرض
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Layout Designer */}
            <Card variant="gradient-purple">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5" />
                  طراحی چیدمان قالب
                </CardTitle>
                <p className="text-sm text-gray-600">
                  عناصر را بکشید و رها کنید تا ترتیب آن‌ها را تغییر دهید
                </p>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="layout-elements">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {layoutElements.map((element, index) => (
                          <Draggable
                            key={element.id}
                            draggableId={element.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                  snapshot.isDragging
                                    ? 'border-purple-300 bg-purple-50 shadow-lg'
                                    : element.enabled
                                    ? 'border-gray-200 bg-white'
                                    : 'border-gray-100 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={element.enabled}
                                        onChange={() => toggleElementEnabled(element.id)}
                                        className="rounded"
                                      />
                                      <span className={`font-medium ${
                                        element.enabled ? 'text-gray-900' : 'text-gray-500'
                                      }`}>
                                        {element.label}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // TODO: Open element configuration modal
                                      }}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                <div className="flex justify-end mt-6 pt-4 border-t">
                  <Button
                    variant="gradient-purple"
                    onClick={handleUpdateTemplate}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        در حال ذخیره...
                      </>
                    ) : (
                      'ذخیره تغییرات'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card variant="professional">
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <Layout className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">قالبی انتخاب نشده</h3>
                <p className="text-sm">
                  برای شروع طراحی، یک قالب از فهرست سمت راست انتخاب کنید
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TemplateDesigner;
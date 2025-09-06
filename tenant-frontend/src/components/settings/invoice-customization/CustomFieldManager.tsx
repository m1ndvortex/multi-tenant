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
  InvoiceCustomField, 
  CreateInvoiceCustomField,
  InvoiceTemplate
} from '@/services/invoiceCustomizationService';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Eye,
  EyeOff,
  GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const fieldTypeIcons = {
  TEXT: Type,
  NUMBER: Hash,
  DECIMAL: Hash,
  DATE: Calendar,
  BOOLEAN: ToggleLeft,
  SELECT: List,
};

const fieldTypeLabels = {
  TEXT: 'متن',
  NUMBER: 'عدد صحیح',
  DECIMAL: 'عدد اعشاری',
  DATE: 'تاریخ',
  BOOLEAN: 'بولین (بله/خیر)',
  SELECT: 'انتخابی (فهرست)',
};

const CustomFieldManager: React.FC = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customFields, setCustomFields] = useState<InvoiceCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingField, setEditingField] = useState<InvoiceCustomField | null>(null);
  const { toast } = useToast();

  // Form state for creating/editing custom fields
  const [formData, setFormData] = useState<CreateInvoiceCustomField>({
    template_id: '',
    field_name: '',
    display_name: '',
    field_type: 'TEXT',
    is_required: false,
    is_line_item_field: true,
    default_value: '',
    validation_rules: {},
    select_options: [],
    display_order: 0,
    column_width: '',
    is_visible_on_print: true,
  });

  // Select options for SELECT type fields
  const [selectOptions, setSelectOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      loadCustomFields();
    }
  }, [selectedTemplateId]);

  const loadTemplates = async () => {
    try {
      const response = await invoiceCustomizationService.getTemplates();
      setTemplates(response.templates);
      
      if (response.templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(response.templates[0].id);
      }
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

  const loadCustomFields = async () => {
    if (!selectedTemplateId) return;

    try {
      const response = await invoiceCustomizationService.getCustomFields({
        template_id: selectedTemplateId,
      });
      
      // Sort by display_order
      const sortedFields = response.custom_fields.sort((a, b) => a.display_order - b.display_order);
      setCustomFields(sortedFields);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری فیلدهای سفارشی',
        variant: 'destructive',
      });
    }
  };

  const handleCreateField = async () => {
    if (!formData.field_name.trim() || !formData.display_name.trim()) {
      toast({
        title: 'خطا',
        description: 'نام فیلد و نام نمایشی الزامی است',
        variant: 'destructive',
      });
      return;
    }

    // Validate field name format (snake_case)
    const fieldNameRegex = /^[a-z][a-z0-9_]*$/;
    if (!fieldNameRegex.test(formData.field_name)) {
      toast({
        title: 'خطا',
        description: 'نام فیلد باید با حروف کوچک شروع شود و فقط شامل حروف، اعداد و _ باشد',
        variant: 'destructive',
      });
      return;
    }

    // Validate SELECT field options
    if (formData.field_type === 'SELECT' && selectOptions.length === 0) {
      toast({
        title: 'خطا',
        description: 'فیلدهای انتخابی باید حداقل یک گزینه داشته باشند',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const fieldData = {
        ...formData,
        template_id: selectedTemplateId,
        select_options: formData.field_type === 'SELECT' ? selectOptions : undefined,
        display_order: customFields.length,
      };

      const newField = await invoiceCustomizationService.createCustomField(fieldData);
      setCustomFields([...customFields, newField]);
      resetForm();
      setShowCreateForm(false);
      
      toast({
        title: 'موفقیت',
        description: 'فیلد سفارشی جدید با موفقیت ایجاد شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد فیلد سفارشی',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async () => {
    if (!editingField) return;

    setSaving(true);
    try {
      const fieldData = {
        ...formData,
        select_options: formData.field_type === 'SELECT' ? selectOptions : undefined,
      };

      const updatedField = await invoiceCustomizationService.updateCustomField(
        editingField.id,
        fieldData
      );
      
      setCustomFields(fields => 
        fields.map(field => field.id === updatedField.id ? updatedField : field)
      );
      
      resetForm();
      setEditingField(null);
      
      toast({
        title: 'موفقیت',
        description: 'فیلد سفارشی با موفقیت به‌روزرسانی شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در به‌روزرسانی فیلد سفارشی',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('آیا از حذف این فیلد سفارشی اطمینان دارید؟')) return;

    try {
      await invoiceCustomizationService.deleteCustomField(fieldId);
      setCustomFields(fields => fields.filter(field => field.id !== fieldId));
      
      toast({
        title: 'موفقیت',
        description: 'فیلد سفارشی با موفقیت حذف شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در حذف فیلد سفارشی',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(customFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all fields
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setCustomFields(updatedItems);

    // TODO: Update display_order on server
    // This would require a batch update API endpoint
  };

  const editField = (field: InvoiceCustomField) => {
    setEditingField(field);
    setFormData({
      template_id: field.template_id,
      field_name: field.field_name,
      display_name: field.display_name,
      field_type: field.field_type,
      is_required: field.is_required,
      is_line_item_field: field.is_line_item_field,
      default_value: field.default_value || '',
      validation_rules: field.validation_rules || {},
      select_options: field.select_options || [],
      display_order: field.display_order,
      column_width: field.column_width || '',
      is_visible_on_print: field.is_visible_on_print,
    });
    
    if (field.select_options) {
      setSelectOptions(field.select_options);
    }
    
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      template_id: selectedTemplateId,
      field_name: '',
      display_name: '',
      field_type: 'TEXT',
      is_required: false,
      is_line_item_field: true,
      default_value: '',
      validation_rules: {},
      select_options: [],
      display_order: 0,
      column_width: '',
      is_visible_on_print: true,
    });
    setSelectOptions([]);
    setNewOptionLabel('');
    setNewOptionValue('');
  };

  const addSelectOption = () => {
    if (!newOptionLabel.trim() || !newOptionValue.trim()) {
      toast({
        title: 'خطا',
        description: 'برچسب و مقدار گزینه الزامی است',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate values
    if (selectOptions.some(option => option.value === newOptionValue)) {
      toast({
        title: 'خطا',
        description: 'مقدار گزینه تکراری است',
        variant: 'destructive',
      });
      return;
    }

    setSelectOptions([...selectOptions, { label: newOptionLabel, value: newOptionValue }]);
    setNewOptionLabel('');
    setNewOptionValue('');
  };

  const removeSelectOption = (index: number) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  const updateField = (field: keyof CreateInvoiceCustomField, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const getFieldTypeIcon = (type: string) => {
    const IconComponent = fieldTypeIcons[type as keyof typeof fieldTypeIcons] || Type;
    return <IconComponent className="h-4 w-4" />;
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
    <div className="space-y-6">
      {/* Template Selection */}
      <Card variant="gradient-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            مدیریت فیلدهای سفارشی
          </CardTitle>
          <p className="text-sm text-gray-600">
            ایجاد و مدیریت فیلدهای سفارشی برای قالب‌های فاکتور
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="template-select">انتخاب قالب</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="قالبی انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.template_type === 'GENERAL' ? 'عمومی' : 
                                     template.template_type === 'GOLD' ? 'طلا' : 'سفارشی'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="gradient-blue"
              onClick={() => {
                resetForm();
                setEditingField(null);
                setShowCreateForm(true);
              }}
              disabled={!selectedTemplateId}
            >
              <Plus className="h-4 w-4 ml-1" />
              فیلد جدید
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom Fields List */}
        <div className="lg:col-span-2">
          <Card variant="professional">
            <CardHeader>
              <CardTitle>فیلدهای سفارشی</CardTitle>
              <p className="text-sm text-gray-600">
                فیلدها را بکشید و رها کنید تا ترتیب آن‌ها را تغییر دهید
              </p>
            </CardHeader>
            <CardContent>
              {customFields.length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="custom-fields">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {customFields.map((field, index) => (
                          <Draggable
                            key={field.id}
                            draggableId={field.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                  snapshot.isDragging
                                    ? 'border-blue-300 bg-blue-50 shadow-lg'
                                    : 'border-gray-200 bg-white hover:border-blue-200'
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
                                      {getFieldTypeIcon(field.field_type)}
                                      <div>
                                        <h3 className="font-medium text-gray-900">
                                          {field.display_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                          {field.field_name} • {fieldTypeLabels[field.field_type]}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {field.is_required && (
                                        <Badge variant="destructive" className="text-xs">
                                          الزامی
                                        </Badge>
                                      )}
                                      {field.is_line_item_field ? (
                                        <Badge variant="default" className="text-xs">
                                          آیتم
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">
                                          سربرگ
                                        </Badge>
                                      )}
                                      {field.is_visible_on_print ? (
                                        <Eye className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => editField(field)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteField(field.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Field Details */}
                                <div className="mt-3 text-sm text-gray-600">
                                  {field.default_value && (
                                    <p>مقدار پیش‌فرض: {field.default_value}</p>
                                  )}
                                  {field.select_options && field.select_options.length > 0 && (
                                    <p>گزینه‌ها: {field.select_options.map(opt => opt.label).join(', ')}</p>
                                  )}
                                  {field.column_width && (
                                    <p>عرض ستون: {field.column_width}</p>
                                  )}
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
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">هیچ فیلد سفارشی‌ای یافت نشد</h3>
                  <p className="text-sm">
                    برای این قالب فیلد سفارشی ایجاد نشده است
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Form */}
        <div className="lg:col-span-1">
          {showCreateForm && (
            <Card variant="gradient-blue">
              <CardHeader>
                <CardTitle>
                  {editingField ? 'ویرایش فیلد' : 'ایجاد فیلد جدید'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="field-name">نام فیلد *</Label>
                  <Input
                    id="field-name"
                    value={formData.field_name}
                    onChange={(e) => updateField('field_name', e.target.value)}
                    placeholder="field_name"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500">
                    فقط حروف کوچک، اعداد و _ مجاز است
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">نام نمایشی *</Label>
                  <Input
                    id="display-name"
                    value={formData.display_name}
                    onChange={(e) => updateField('display_name', e.target.value)}
                    placeholder="نام نمایشی فیلد"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field-type">نوع فیلد</Label>
                  <Select
                    value={formData.field_type}
                    onValueChange={(value: any) => updateField('field_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fieldTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {getFieldTypeIcon(value)}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SELECT field options */}
                {formData.field_type === 'SELECT' && (
                  <div className="space-y-3">
                    <Label>گزینه‌های انتخابی</Label>
                    
                    {/* Add new option */}
                    <div className="space-y-2">
                      <Input
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        placeholder="برچسب گزینه"
                      />
                      <Input
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        placeholder="مقدار گزینه"
                        dir="ltr"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSelectOption}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        افزودن گزینه
                      </Button>
                    </div>

                    {/* Options list */}
                    {selectOptions.length > 0 && (
                      <div className="space-y-2">
                        {selectOptions.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div>
                              <span className="font-medium">{option.label}</span>
                              <span className="text-sm text-gray-500 mr-2">({option.value})</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSelectOption(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="default-value">مقدار پیش‌فرض</Label>
                  <Input
                    id="default-value"
                    value={formData.default_value}
                    onChange={(e) => updateField('default_value', e.target.value)}
                    placeholder="مقدار پیش‌فرض"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="column-width">عرض ستون</Label>
                  <Input
                    id="column-width"
                    value={formData.column_width}
                    onChange={(e) => updateField('column_width', e.target.value)}
                    placeholder="مثال: 100px یا 20%"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-required"
                      checked={formData.is_required}
                      onChange={(e) => updateField('is_required', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="is-required">الزامی</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-line-item-field"
                      checked={formData.is_line_item_field}
                      onChange={(e) => updateField('is_line_item_field', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="is-line-item-field">فیلد آیتم (در غیر این صورت فیلد سربرگ)</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-visible-on-print"
                      checked={formData.is_visible_on_print}
                      onChange={(e) => updateField('is_visible_on_print', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="is-visible-on-print">نمایش در چاپ</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="gradient-blue"
                    onClick={editingField ? handleUpdateField : handleCreateField}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        در حال ذخیره...
                      </>
                    ) : (
                      editingField ? 'به‌روزرسانی' : 'ایجاد'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingField(null);
                      resetForm();
                    }}
                  >
                    انصراف
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomFieldManager;
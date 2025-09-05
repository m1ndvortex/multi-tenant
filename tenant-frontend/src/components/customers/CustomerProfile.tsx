import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar, 
  CreditCard, AlertTriangle, MessageSquare, Plus,
  User, Building, Crown, TrendingUp, DollarSign, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  customerService, 
  Customer, 
  CustomerInteraction, 
  CustomerInteractionCreate 
} from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

interface CustomerProfileProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ 
  customer, 
  onEdit, 
  onDelete, 
  onBack 
}) => {
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [interactionForm, setInteractionForm] = useState<Partial<CustomerInteractionCreate>>({
    interaction_type: 'NOTE',
    subject: '',
    description: '',
    follow_up_required: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadInteractions();
  }, [customer.id]);

  const loadInteractions = async () => {
    try {
      setLoadingInteractions(true);
      const response = await customerService.getCustomerInteractions(customer.id);
      setInteractions(response.interactions);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تعاملات مشتری',
        variant: 'destructive',
      });
    } finally {
      setLoadingInteractions(false);
    }
  };

  const handleAddInteraction = async () => {
    try {
      if (!interactionForm.subject?.trim()) {
        toast({
          title: 'خطا',
          description: 'موضوع تعامل الزامی است',
          variant: 'destructive',
        });
        return;
      }

      const newInteraction = await customerService.createCustomerInteraction({
        customer_id: customer.id,
        interaction_type: interactionForm.interaction_type!,
        subject: interactionForm.subject,
        description: interactionForm.description,
        follow_up_required: interactionForm.follow_up_required,
        follow_up_date: interactionForm.follow_up_date,
      });

      setInteractions([newInteraction, ...interactions]);
      setShowAddInteraction(false);
      setInteractionForm({
        interaction_type: 'NOTE',
        subject: '',
        description: '',
        follow_up_required: false,
      });

      toast({
        title: 'موفقیت',
        description: 'تعامل جدید ثبت شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ثبت تعامل',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL':
        return <User className="h-5 w-5 text-blue-600" />;
      case 'BUSINESS':
        return <Building className="h-5 w-5 text-purple-600" />;
      case 'VIP':
        return <Crown className="h-5 w-5 text-yellow-600" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">فعال</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800">غیرفعال</Badge>;
      case 'BLOCKED':
        return <Badge className="bg-red-100 text-red-800">مسدود</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getInteractionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'CALL': 'تماس تلفنی',
      'EMAIL': 'ایمیل',
      'SMS': 'پیامک',
      'MEETING': 'جلسه',
      'NOTE': 'یادداشت',
      'PURCHASE': 'خرید',
      'PAYMENT': 'پرداخت',
      'COMPLAINT': 'شکایت',
      'SUPPORT': 'پشتیبانی',
    };
    return types[type] || type;
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="h-4 w-4" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      case 'SMS':
        return <MessageSquare className="h-4 w-4" />;
      case 'MEETING':
        return <Calendar className="h-4 w-4" />;
      case 'PURCHASE':
        return <Package className="h-4 w-4" />;
      case 'PAYMENT':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const formatGoldWeight = (weight: number) => {
    return new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 3 }).format(weight) + ' گرم';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            {getTypeIcon(customer.customer_type)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.display_name}</h1>
            <div className="flex items-center gap-2">
              {getStatusBadge(customer.status)}
              <Badge variant="outline">{getInteractionTypeLabel(customer.customer_type)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 ml-2" />
            ویرایش
          </Button>
          <Button variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 ml-2" />
            حذف
          </Button>
        </div>
      </div>

      {/* Customer Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="gradient-green">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">کل خریدها</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(customer.total_purchases)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-blue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">بدهی ریالی</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customer.total_debt > 0 ? formatCurrency(customer.total_debt) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">بدهی طلا</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customer.total_gold_debt > 0 ? formatGoldWeight(customer.total_gold_debt) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">آخرین خرید</p>
                <p className="text-lg font-bold text-gray-900">
                  {customer.last_purchase_at 
                    ? new Date(customer.last_purchase_at).toLocaleDateString('fa-IR')
                    : 'هیچ خریدی ندارد'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">اطلاعات مشتری</TabsTrigger>
          <TabsTrigger value="interactions">تعاملات</TabsTrigger>
          <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
        </TabsList>

        {/* Customer Information */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  اطلاعات پایه
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">نام:</span>
                  <span className="font-medium">{customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع مشتری:</span>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(customer.customer_type)}
                    <span>{getInteractionTypeLabel(customer.customer_type)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">وضعیت:</span>
                  {getStatusBadge(customer.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">سقف اعتبار:</span>
                  <span className="font-medium">{formatCurrency(customer.credit_limit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاریخ عضویت:</span>
                  <span>{new Date(customer.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  اطلاعات تماس
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.mobile && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer.mobile}</span>
                  </div>
                )}
                {customer.full_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <span className="text-sm">{customer.full_address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">روش ارتباط ترجیحی:</span>
                  <span>{customer.preferred_contact_method === 'phone' ? 'تلفن' : 
                         customer.preferred_contact_method === 'email' ? 'ایمیل' : 'پیامک'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tags and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="professional">
              <CardHeader>
                <CardTitle>برچسب‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">برچسبی تعریف نشده</p>
                )}
              </CardContent>
            </Card>

            <Card variant="professional">
              <CardHeader>
                <CardTitle>یادداشت‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.notes ? (
                  <p className="text-sm">{customer.notes}</p>
                ) : (
                  <p className="text-gray-500">یادداشتی وجود ندارد</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Business Information (if applicable) */}
          {customer.customer_type === 'BUSINESS' && (
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  اطلاعات تجاری
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.business_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">نام تجاری:</span>
                      <span className="font-medium">{customer.business_name}</span>
                    </div>
                  )}
                  {customer.tax_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">شناسه مالیاتی:</span>
                      <span className="font-medium">{customer.tax_id}</span>
                    </div>
                  )}
                  {customer.business_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">نوع کسب‌وکار:</span>
                      <span className="font-medium">{customer.business_type}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Customer Interactions */}
        <TabsContent value="interactions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">تعاملات مشتری</h3>
            <Dialog open={showAddInteraction} onOpenChange={setShowAddInteraction}>
              <DialogTrigger asChild>
                <Button variant="gradient-green">
                  <Plus className="h-4 w-4 ml-2" />
                  تعامل جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>ثبت تعامل جدید</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع تعامل</Label>
                    <Select
                      value={interactionForm.interaction_type}
                      onValueChange={(value) => setInteractionForm({
                        ...interactionForm,
                        interaction_type: value as any
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CALL">تماس تلفنی</SelectItem>
                        <SelectItem value="EMAIL">ایمیل</SelectItem>
                        <SelectItem value="SMS">پیامک</SelectItem>
                        <SelectItem value="MEETING">جلسه</SelectItem>
                        <SelectItem value="NOTE">یادداشت</SelectItem>
                        <SelectItem value="COMPLAINT">شکایت</SelectItem>
                        <SelectItem value="SUPPORT">پشتیبانی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>موضوع</Label>
                    <Input
                      value={interactionForm.subject}
                      onChange={(e) => setInteractionForm({
                        ...interactionForm,
                        subject: e.target.value
                      })}
                      placeholder="موضوع تعامل"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>توضیحات</Label>
                    <Textarea
                      value={interactionForm.description}
                      onChange={(e) => setInteractionForm({
                        ...interactionForm,
                        description: e.target.value
                      })}
                      placeholder="جزئیات تعامل"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="follow_up"
                      checked={interactionForm.follow_up_required}
                      onChange={(e) => setInteractionForm({
                        ...interactionForm,
                        follow_up_required: e.target.checked
                      })}
                    />
                    <Label htmlFor="follow_up">نیاز به پیگیری دارد</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddInteraction(false)}>
                      انصراف
                    </Button>
                    <Button variant="gradient-green" onClick={handleAddInteraction}>
                      ثبت تعامل
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card variant="professional">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع</TableHead>
                    <TableHead>موضوع</TableHead>
                    <TableHead>توضیحات</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>پیگیری</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInteractions ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        در حال بارگذاری...
                      </TableCell>
                    </TableRow>
                  ) : interactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        تعاملی ثبت نشده است
                      </TableCell>
                    </TableRow>
                  ) : (
                    interactions.map((interaction) => (
                      <TableRow key={interaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getInteractionIcon(interaction.interaction_type)}
                            <span className="text-sm">
                              {getInteractionTypeLabel(interaction.interaction_type)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {interaction.subject}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {interaction.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(interaction.created_at).toLocaleDateString('fa-IR')}
                        </TableCell>
                        <TableCell>
                          {interaction.follow_up_required ? (
                            <Badge className="bg-orange-100 text-orange-800">
                              نیاز به پیگیری
                            </Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Transactions */}
        <TabsContent value="transactions" className="space-y-6">
          <Card variant="professional">
            <CardHeader>
              <CardTitle>تراکنش‌های مشتری</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>تراکنش‌های مشتری در نسخه‌های آینده اضافه خواهد شد</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerProfile;
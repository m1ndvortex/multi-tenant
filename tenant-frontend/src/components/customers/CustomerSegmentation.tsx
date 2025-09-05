import React, { useState, useEffect } from 'react';
import { 
  Users, Send, 
  Target, TrendingUp, Crown, AlertTriangle, Plus, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerService, Customer, CustomerSearchParams } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

interface CustomerSegmentationProps {
  onBack: () => void;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  filters: CustomerSearchParams;
  customerCount: number;
  customers: Customer[];
}

interface CampaignForm {
  name: string;
  type: 'EMAIL' | 'SMS';
  subject: string;
  message: string;
  segmentId: string;
}

const CustomerSegmentation: React.FC<CustomerSegmentationProps> = ({ onBack }) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { toast } = useToast();

  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    filters: {
      status: 'all',
      customer_type: 'all',
      has_debt: undefined as boolean | undefined,
      tags: [] as string[],
      city: '',
    }
  });

  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    name: '',
    type: 'SMS',
    subject: '',
    message: '',
    segmentId: '',
  });

  useEffect(() => {
    loadAvailableTags();
    loadDefaultSegments();
  }, []);

  const loadAvailableTags = async () => {
    try {
      const response = await customerService.getCustomerTags();
      setAvailableTags(Object.keys(response.tag_counts));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadDefaultSegments = () => {
    // Create some default segments
    const defaultSegments: Segment[] = [
      {
        id: 'active-customers',
        name: 'مشتریان فعال',
        description: 'مشتریان با وضعیت فعال',
        filters: { status: 'ACTIVE', customer_type: 'all', has_debt: undefined, tags: [], city: '' },
        customerCount: 0,
        customers: [],
      },
      {
        id: 'vip-customers',
        name: 'مشتریان VIP',
        description: 'مشتریان ویژه',
        filters: { status: 'all', customer_type: 'VIP', has_debt: undefined, tags: [], city: '' },
        customerCount: 0,
        customers: [],
      },
      {
        id: 'debt-customers',
        name: 'مشتریان بدهکار',
        description: 'مشتریان دارای بدهی',
        filters: { status: 'all', customer_type: 'all', has_debt: true, tags: [], city: '' },
        customerCount: 0,
        customers: [],
      },
    ];

    setSegments(defaultSegments);
    // Load customer counts for each segment
    defaultSegments.forEach(segment => loadSegmentCustomers(segment));
  };

  const loadSegmentCustomers = async (segment: Segment) => {
    try {
      const filters = { ...segment.filters };
      // Convert "all" values to undefined
      const { status, customer_type, ...otherFilters } = filters;
      const cleanFilters = {
        ...otherFilters,
        ...(status !== 'all' && { status }),
        ...(customer_type !== 'all' && { customer_type })
      };
      
      const response = await customerService.getCustomers({
        ...cleanFilters,
        per_page: 100,
      });
      
      setSegments(prev => prev.map(s => 
        s.id === segment.id 
          ? { ...s, customerCount: response.total, customers: response.customers }
          : s
      ));
    } catch (error) {
      console.error('Error loading segment customers:', error);
    }
  };

  const handleCreateSegment = async () => {
    try {
      if (!segmentForm.name.trim()) {
        toast({
          title: 'خطا',
          description: 'نام بخش الزامی است',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      
      // Test the filters to get customer count
      const filters = { ...segmentForm.filters };
      // Convert "all" values to undefined
      const { status, customer_type, ...otherFilters } = filters;
      const cleanFilters = {
        ...otherFilters,
        ...(status !== 'all' && { status }),
        ...(customer_type !== 'all' && { customer_type })
      };
      
      const response = await customerService.getCustomers({
        ...cleanFilters,
        per_page: 100,
      });

      const newSegment: Segment = {
        id: `custom-${Date.now()}`,
        name: segmentForm.name,
        description: segmentForm.description,
        filters: segmentForm.filters,
        customerCount: response.total,
        customers: response.customers,
      };

      setSegments([...segments, newSegment]);
      setShowCreateSegment(false);
      setSegmentForm({
        name: '',
        description: '',
        filters: {
          status: 'all',
          customer_type: 'all',
          has_debt: undefined,
          tags: [],
          city: '',
        }
      });

      toast({
        title: 'موفقیت',
        description: 'بخش جدید ایجاد شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد بخش',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    try {
      if (!campaignForm.name.trim() || !campaignForm.message.trim() || !campaignForm.segmentId) {
        toast({
          title: 'خطا',
          description: 'لطفاً تمام فیلدهای الزامی را پر کنید',
          variant: 'destructive',
        });
        return;
      }

      const segment = segments.find(s => s.id === campaignForm.segmentId);
      if (!segment) {
        toast({
          title: 'خطا',
          description: 'بخش انتخاب شده یافت نشد',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      // TODO: Implement actual campaign sending
      // This would typically call a backend API to send emails/SMS
      
      toast({
        title: 'موفقیت',
        description: `کمپین "${campaignForm.name}" برای ${segment.customerCount} مشتری ارسال شد`,
      });

      setShowCreateCampaign(false);
      setCampaignForm({
        name: '',
        type: 'SMS',
        subject: '',
        message: '',
        segmentId: '',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ارسال کمپین',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addTagToFilter = (tag: string) => {
    if (!segmentForm.filters.tags.includes(tag)) {
      setSegmentForm({
        ...segmentForm,
        filters: {
          ...segmentForm.filters,
          tags: [...segmentForm.filters.tags, tag]
        }
      });
    }
  };

  const removeTagFromFilter = (tag: string) => {
    setSegmentForm({
      ...segmentForm,
      filters: {
        ...segmentForm.filters,
        tags: segmentForm.filters.tags.filter(t => t !== tag)
      }
    });
  };

  const getSegmentIcon = (segment: Segment) => {
    if (segment.filters.customer_type === 'VIP') return <Crown className="h-5 w-5 text-yellow-600" />;
    if (segment.filters.has_debt) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (segment.filters.status === 'ACTIVE') return <TrendingUp className="h-5 w-5 text-green-600" />;
    return <Target className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <X className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">بخش‌بندی مشتریان</h1>
            <p className="text-sm text-gray-500">مدیریت بخش‌ها و کمپین‌های بازاریابی</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateSegment} onOpenChange={setShowCreateSegment}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 ml-2" />
                بخش جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>ایجاد بخش جدید</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نام بخش</Label>
                    <Input
                      value={segmentForm.name}
                      onChange={(e) => setSegmentForm({...segmentForm, name: e.target.value})}
                      placeholder="نام بخش"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>وضعیت</Label>
                    <Select
                      value={segmentForm.filters.status}
                      onValueChange={(value) => setSegmentForm({
                        ...segmentForm,
                        filters: {...segmentForm.filters, status: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب وضعیت" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه</SelectItem>
                        <SelectItem value="ACTIVE">فعال</SelectItem>
                        <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                        <SelectItem value="BLOCKED">مسدود</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Textarea
                    value={segmentForm.description}
                    onChange={(e) => setSegmentForm({...segmentForm, description: e.target.value})}
                    placeholder="توضیحات بخش"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع مشتری</Label>
                    <Select
                      value={segmentForm.filters.customer_type}
                      onValueChange={(value) => setSegmentForm({
                        ...segmentForm,
                        filters: {...segmentForm.filters, customer_type: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب نوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه</SelectItem>
                        <SelectItem value="INDIVIDUAL">شخصی</SelectItem>
                        <SelectItem value="BUSINESS">تجاری</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>وضعیت بدهی</Label>
                    <Select
                      value={segmentForm.filters.has_debt === true ? 'with_debt' : 
                             segmentForm.filters.has_debt === false ? 'no_debt' : ''}
                      onValueChange={(value) => setSegmentForm({
                        ...segmentForm,
                        filters: {
                          ...segmentForm.filters, 
                          has_debt: value === 'with_debt' ? true : value === 'no_debt' ? false : undefined
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="وضعیت بدهی" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه</SelectItem>
                        <SelectItem value="with_debt">دارای بدهی</SelectItem>
                        <SelectItem value="no_debt">بدون بدهی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>برچسب‌ها</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {availableTags.map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTagToFilter(tag)}
                        disabled={segmentForm.filters.tags.includes(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {segmentForm.filters.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTagFromFilter(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateSegment(false)}>
                    انصراف
                  </Button>
                  <Button variant="gradient-green" onClick={handleCreateSegment} disabled={loading}>
                    {loading ? 'در حال ایجاد...' : 'ایجاد بخش'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
            <DialogTrigger asChild>
              <Button variant="gradient-green">
                <Send className="h-4 w-4 ml-2" />
                کمپین جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>ایجاد کمپین بازاریابی</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نام کمپین</Label>
                    <Input
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                      placeholder="نام کمپین"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع کمپین</Label>
                    <Select
                      value={campaignForm.type}
                      onValueChange={(value) => setCampaignForm({...campaignForm, type: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">پیامک</SelectItem>
                        <SelectItem value="EMAIL">ایمیل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>بخش هدف</Label>
                  <Select
                    value={campaignForm.segmentId}
                    onValueChange={(value) => setCampaignForm({...campaignForm, segmentId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب بخش" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name} ({segment.customerCount} مشتری)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {campaignForm.type === 'EMAIL' && (
                  <div className="space-y-2">
                    <Label>موضوع ایمیل</Label>
                    <Input
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm({...campaignForm, subject: e.target.value})}
                      placeholder="موضوع ایمیل"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>متن پیام</Label>
                  <Textarea
                    value={campaignForm.message}
                    onChange={(e) => setCampaignForm({...campaignForm, message: e.target.value})}
                    placeholder="متن پیام"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                    انصراف
                  </Button>
                  <Button variant="gradient-green" onClick={handleSendCampaign} disabled={loading}>
                    {loading ? 'در حال ارسال...' : 'ارسال کمپین'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.map((segment) => (
          <Card 
            key={segment.id} 
            variant="professional"
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedSegment(segment)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSegmentIcon(segment)}
                {segment.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-lg font-bold">{segment.customerCount}</span>
                  <span className="text-sm text-gray-500">مشتری</span>
                </div>
                <Button variant="outline" size="sm">
                  مشاهده
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Segment Details */}
      {selectedSegment && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getSegmentIcon(selectedSegment)}
              {selectedSegment.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="customers" className="w-full">
              <TabsList>
                <TabsTrigger value="customers">مشتریان ({selectedSegment.customerCount})</TabsTrigger>
                <TabsTrigger value="filters">فیلترها</TabsTrigger>
              </TabsList>

              <TabsContent value="customers">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>نوع</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>تماس</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSegment.customers.slice(0, 10).map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.display_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {customer.customer_type === 'INDIVIDUAL' ? 'شخصی' :
                             customer.customer_type === 'BUSINESS' ? 'تجاری' : 'VIP'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            customer.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {customer.status === 'ACTIVE' ? 'فعال' :
                             customer.status === 'INACTIVE' ? 'غیرفعال' : 'مسدود'}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.primary_contact}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {selectedSegment.customers.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    و {selectedSegment.customers.length - 10} مشتری دیگر...
                  </p>
                )}
              </TabsContent>

              <TabsContent value="filters">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedSegment.filters.status && (
                      <div>
                        <Label className="text-sm text-gray-600">وضعیت</Label>
                        <p className="font-medium">{selectedSegment.filters.status}</p>
                      </div>
                    )}
                    {selectedSegment.filters.customer_type && (
                      <div>
                        <Label className="text-sm text-gray-600">نوع مشتری</Label>
                        <p className="font-medium">{selectedSegment.filters.customer_type}</p>
                      </div>
                    )}
                    {selectedSegment.filters.has_debt !== undefined && (
                      <div>
                        <Label className="text-sm text-gray-600">وضعیت بدهی</Label>
                        <p className="font-medium">
                          {selectedSegment.filters.has_debt ? 'دارای بدهی' : 'بدون بدهی'}
                        </p>
                      </div>
                    )}
                    {selectedSegment.filters.city && (
                      <div>
                        <Label className="text-sm text-gray-600">شهر</Label>
                        <p className="font-medium">{selectedSegment.filters.city}</p>
                      </div>
                    )}
                  </div>
                  {selectedSegment.filters.tags && selectedSegment.filters.tags.length > 0 && (
                    <div>
                      <Label className="text-sm text-gray-600">برچسب‌ها</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedSegment.filters.tags.map((tag) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSegmentation;
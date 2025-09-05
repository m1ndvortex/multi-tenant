import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { settingsService, GoldPrice, CreateGoldPriceRequest } from '@/services/settingsService';
import { 
  Coins, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// Chart functionality will be added when Chart.js is properly configured

const GoldPriceManagement: React.FC = () => {
  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>([]);
  const [currentPrice, setCurrentPrice] = useState<GoldPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<GoldPrice | null>(null);
  const [createForm, setCreateForm] = useState<CreateGoldPriceRequest>({
    date: new Date().toISOString().split('T')[0],
    price: 0,
  });
  const [editForm, setEditForm] = useState({ price: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadGoldPrices();
    loadCurrentPrice();
  }, [dateRange]);

  const loadGoldPrices = async () => {
    try {
      const data = await settingsService.getGoldPrices(dateRange.startDate, dateRange.endDate);
      setGoldPrices(data);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری قیمت‌های طلا',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPrice = async () => {
    try {
      const data = await settingsService.getCurrentGoldPrice();
      setCurrentPrice(data);
    } catch (error) {
      // Current price might not exist, which is okay
    }
  };

  const handleCreatePrice = async () => {
    if (!createForm.price || createForm.price <= 0) {
      toast({
        title: 'خطا',
        description: 'لطفاً قیمت معتبری وارد کنید',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const newPrice = await settingsService.createGoldPrice(createForm);
      setGoldPrices([newPrice, ...goldPrices]);
      setCurrentPrice(newPrice);
      setCreateForm({
        date: new Date().toISOString().split('T')[0],
        price: 0,
      });
      setIsCreateDialogOpen(false);
      toast({
        title: 'موفقیت',
        description: 'قیمت طلا با موفقیت ثبت شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ثبت قیمت طلا',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPrice = async () => {
    if (!editingPrice || !editForm.price || editForm.price <= 0) {
      toast({
        title: 'خطا',
        description: 'لطفاً قیمت معتبری وارد کنید',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const updatedPrice = await settingsService.updateGoldPrice(editingPrice.id, editForm.price);
      setGoldPrices(goldPrices.map(price => 
        price.id === editingPrice.id ? updatedPrice : price
      ));
      if (currentPrice?.id === editingPrice.id) {
        setCurrentPrice(updatedPrice);
      }
      setEditingPrice(null);
      setEditForm({ price: 0 });
      setIsEditDialogOpen(false);
      toast({
        title: 'موفقیت',
        description: 'قیمت طلا با موفقیت به‌روزرسانی شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در به‌روزرسانی قیمت طلا',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    try {
      await settingsService.deleteGoldPrice(priceId);
      setGoldPrices(goldPrices.filter(price => price.id !== priceId));
      if (currentPrice?.id === priceId) {
        setCurrentPrice(null);
      }
      toast({
        title: 'موفقیت',
        description: 'قیمت طلا با موفقیت حذف شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در حذف قیمت طلا',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (price: GoldPrice) => {
    setEditingPrice(price);
    setEditForm({ price: price.price });
    setIsEditDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  // Chart functionality will be implemented when Chart.js is properly configured

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
      {/* Current Price Card */}
      <Card variant="gradient-yellow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>قیمت فعلی طلا</CardTitle>
                <p className="text-sm text-gray-600 mt-1">آخرین قیمت ثبت شده</p>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient-yellow">
                  <Plus className="h-4 w-4 ml-2" />
                  ثبت قیمت جدید
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ثبت قیمت جدید طلا</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-date">تاریخ</Label>
                    <Input
                      id="create-date"
                      type="date"
                      value={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="create-price">قیمت (ریال) *</Label>
                    <Input
                      id="create-price"
                      type="number"
                      value={createForm.price || ''}
                      onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                      placeholder="قیمت هر گرم طلا"
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={submitting}
                    >
                      انصراف
                    </Button>
                    <Button
                      variant="gradient-yellow"
                      onClick={handleCreatePrice}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          در حال ثبت...
                        </>
                      ) : (
                        'ثبت قیمت'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {currentPrice ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-700">
                  {formatPrice(currentPrice.price)} ریال
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  آخرین به‌روزرسانی: {formatDate(currentPrice.date)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-yellow-600">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">هر گرم</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              هنوز قیمتی ثبت نشده است
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History Chart - Coming Soon */}
      {goldPrices.length > 0 && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle>نمودار قیمت طلا</CardTitle>
            <div className="flex gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">از تاریخ</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">تا تاریخ</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">نمودار قیمت طلا</p>
                <p className="text-sm">نمودار در نسخه‌های آینده اضافه خواهد شد</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price History Table */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle>تاریخچه قیمت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goldPrices.map((price) => (
              <div
                key={price.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {formatPrice(price.price)} ریال
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {formatDate(price.date)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(price)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف قیمت</AlertDialogTitle>
                        <AlertDialogDescription>
                          آیا از حذف قیمت مورخ {formatDate(price.date)} اطمینان دارید؟ این عمل قابل بازگشت نیست.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePrice(price.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            
            {goldPrices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                هیچ قیمتی در این بازه زمانی یافت نشد
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش قیمت طلا</DialogTitle>
          </DialogHeader>
          {editingPrice && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>تاریخ</Label>
                <div className="p-2 bg-gray-100 rounded">
                  {formatDate(editingPrice.date)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-price">قیمت (ریال) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editForm.price || ''}
                  onChange={(e) => setEditForm({ price: Number(e.target.value) })}
                  placeholder="قیمت هر گرم طلا"
                  dir="ltr"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={submitting}
                >
                  انصراف
                </Button>
                <Button
                  variant="gradient-yellow"
                  onClick={handleEditPrice}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال ذخیره...
                    </>
                  ) : (
                    'ذخیره تغییرات'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoldPriceManagement;
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  Edit,
  Save,
  RefreshCw,
  BarChart3,
  Info,
  AlertCircle
} from 'lucide-react';
import { installmentService } from '@/services/installmentService';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface GoldPriceManagementProps {
  onPriceUpdate?: (newPrice: number) => void;
}

const GoldPriceManagement: React.FC<GoldPriceManagementProps> = ({
  onPriceUpdate,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // Fetch current gold price
  const { data: currentPrice, isLoading: isLoadingPrice } = useQuery({
    queryKey: ['gold-price-current'],
    queryFn: () => installmentService.getCurrentGoldPrice(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch gold price history
  const { data: priceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['gold-price-history'],
    queryFn: () => installmentService.getGoldPriceHistory(30),
  });

  // Update gold price mutation
  const updatePriceMutation = useMutation({
    mutationFn: (price: number) => installmentService.updateGoldPrice(price),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gold-price-current'] });
      queryClient.invalidateQueries({ queryKey: ['gold-price-history'] });
      toast({
        title: 'موفقیت',
        description: 'قیمت طلا با موفقیت بروزرسانی شد',
      });
      setIsUpdateDialogOpen(false);
      setNewPrice(0);
      if (onPriceUpdate) {
        onPriceUpdate(data.price);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در بروزرسانی قیمت',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate price trend
  const getPriceTrend = () => {
    if (!priceHistory || priceHistory.length < 2) return null;
    
    const latest = priceHistory[0];
    const previous = priceHistory[1];
    const change = latest.price - previous.price;
    const changePercent = (change / previous.price) * 100;
    
    return {
      change,
      changePercent,
      isIncrease: change > 0,
    };
  };

  const priceTrend = getPriceTrend();

  const handleUpdatePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrice <= 0) {
      toast({
        title: 'خطا',
        description: 'قیمت باید بیشتر از صفر باشد',
        variant: 'destructive',
      });
      return;
    }
    updatePriceMutation.mutate(newPrice);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Price Card */}
      <Card variant="gradient-green">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            قیمت فعلی طلا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-white">
              {isLoadingPrice ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-white/20 rounded mb-2 w-48"></div>
                  <div className="h-4 bg-white/20 rounded w-32"></div>
                </div>
              ) : currentPrice ? (
                <>
                  <p className="text-3xl font-bold mb-1">
                    {currentPrice.price.toLocaleString()} ریال/گرم
                  </p>
                  <p className="text-white/80 text-sm">
                    آخرین بروزرسانی: {formatDate(currentPrice.updated_at)}
                  </p>
                  {priceTrend && (
                    <div className="flex items-center gap-2 mt-2">
                      {priceTrend.isIncrease ? (
                        <TrendingUp className="h-4 w-4 text-green-200" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-200" />
                      )}
                      <span className={`text-sm ${priceTrend.isIncrease ? 'text-green-200' : 'text-red-200'}`}>
                        {priceTrend.isIncrease ? '+' : ''}{priceTrend.change.toLocaleString()} ریال 
                        ({priceTrend.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/80">خطا در بارگیری قیمت</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['gold-price-current'] })}
                disabled={isLoadingPrice}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingPrice ? 'animate-spin' : ''}`} />
              </Button>
              
              <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Edit className="h-4 w-4 ml-1" />
                    بروزرسانی
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      بروزرسانی قیمت طلا
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleUpdatePrice} className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">قیمت فعلی</span>
                      </div>
                      <p className="text-lg font-bold text-blue-800">
                        {currentPrice?.price.toLocaleString()} ریال/گرم
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-price">قیمت جدید (ریال/گرم)</Label>
                      <Input
                        id="new-price"
                        type="number"
                        min="1"
                        value={newPrice || ''}
                        onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                        placeholder="قیمت جدید طلا"
                        required
                      />
                    </div>

                    {newPrice > 0 && currentPrice && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span>تغییر قیمت:</span>
                          <span className={`font-medium ${
                            newPrice > currentPrice.price ? 'text-green-600' : 
                            newPrice < currentPrice.price ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {newPrice > currentPrice.price ? '+' : ''}
                            {(newPrice - currentPrice.price).toLocaleString()} ریال
                            ({(((newPrice - currentPrice.price) / currentPrice.price) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm text-yellow-700">
                        این قیمت برای محاسبه پرداخت‌های آینده استفاده خواهد شد
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsUpdateDialogOpen(false)}
                        className="flex-1"
                      >
                        انصراف
                      </Button>
                      <Button
                        type="submit"
                        variant="gradient-green"
                        disabled={updatePriceMutation.isPending || newPrice <= 0}
                        className="flex-1"
                      >
                        {updatePriceMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                            در حال بروزرسانی...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 ml-2" />
                            بروزرسانی قیمت
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price History */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تاریخچه قیمت طلا (30 روز اخیر)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between items-center p-3 border rounded">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          ) : priceHistory && priceHistory.length > 0 ? (
            <div className="space-y-2">
              <div className="max-h-64 overflow-y-auto">
                {priceHistory.map((entry, index) => {
                  const isLatest = index === 0;
                  const previousEntry = priceHistory[index + 1];
                  const change = previousEntry ? entry.price - previousEntry.price : 0;
                  const changePercent = previousEntry ? (change / previousEntry.price) * 100 : 0;
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        isLatest ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isLatest && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            فعلی
                          </Badge>
                        )}
                        <div>
                          <p className="font-medium">
                            {formatDate(entry.date)}
                          </p>
                          {entry.updated_by && (
                            <p className="text-xs text-gray-500">
                              بروزرسانی شده توسط: {entry.updated_by}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <p className="font-semibold">
                          {entry.price.toLocaleString()} ریال/گرم
                        </p>
                        {!isLatest && change !== 0 && (
                          <div className="flex items-center gap-1">
                            {change > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change > 0 ? '+' : ''}{change.toLocaleString()} 
                              ({changePercent.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {priceHistory.length >= 30 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500">
                    نمایش 30 روز اخیر
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">تاریخچه قیمت در دسترس نیست</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldPriceManagement;
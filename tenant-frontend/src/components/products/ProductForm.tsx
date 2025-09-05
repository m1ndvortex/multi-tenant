import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';
import { productService, ProductCreate, ProductUpdate } from '@/services/productService';
import { 
  ArrowRight, 
  Save, 
  Package, 
  X
} from 'lucide-react';

interface ProductFormData extends ProductCreate {
  // Additional form-specific fields
}

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ProductFormData>({
    defaultValues: {
      track_inventory: true,
      status: 'ACTIVE',
      is_service: false,
      is_gold_product: false,
      stock_quantity: 0,
      min_stock_level: 0,
      tags: []
    }
  });

  const watchIsGoldProduct = watch('is_gold_product');
  const watchIsService = watch('is_service');
  const watchTrackInventory = watch('track_inventory');

  // Fetch product for editing
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProduct(id!),
    enabled: isEditing,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productService.getCategories(),
  });

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: ProductCreate) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'موفقیت',
        description: 'محصول با موفقیت ایجاد شد',
      });
      navigate('/products');
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) => 
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast({
        title: 'موفقیت',
        description: 'محصول با موفقیت به‌روزرسانی شد',
      });
      navigate('/products');
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Load product data for editing
  useEffect(() => {
    if (product && isEditing) {
      reset({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        tags: product.tags || [],
        cost_price: product.cost_price || 0,
        selling_price: product.selling_price,
        min_price: product.min_price || 0,
        max_price: product.max_price || 0,
        is_gold_product: product.is_gold_product,
        gold_purity: product.gold_purity || 0,
        weight_per_unit: product.weight_per_unit || 0,
        track_inventory: product.track_inventory,
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        max_stock_level: product.max_stock_level || 0,
        status: product.status,
        is_service: product.is_service,
        length: product.length || 0,
        width: product.width || 0,
        height: product.height || 0,
        weight: product.weight || 0,
        manufacturer: product.manufacturer || '',
        brand: product.brand || '',
        model: product.model || '',
        notes: product.notes || '',
      });
      setImageUrls(product.images || []);
    }
  }, [product, isEditing, reset]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setImageFiles(prev => [...prev, ...newFiles]);

    // Create preview URLs
    const previewUrls = newFiles.map(file => URL.createObjectURL(file));
    setImageUrls(prev => [...prev, ...previewUrls]);
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Handle image uploads first if there are new images
      let finalImageUrls = [...imageUrls];
      
      if (imageFiles.length > 0 && (isEditing ? id : true)) {
        setUploadingImages(true);
        
        // For new products, we'll need to create the product first, then upload images
        // For existing products, upload images directly
        if (isEditing && id) {
          for (const file of imageFiles) {
            try {
              const uploadResult = await productService.uploadImage(id, file);
              finalImageUrls.push(uploadResult.image_url);
            } catch (error) {
              console.error('Failed to upload image:', error);
            }
          }
        }
        
        setUploadingImages(false);
      }

      // Prepare form data
      const formData = {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
      };

      if (isEditing && id) {
        updateMutation.mutate({ id, data: formData });
      } else {
        createMutation.mutate(formData);
      }
    } catch (error) {
      setUploadingImages(false);
      toast({
        title: 'خطا',
        description: 'خطا در پردازش فرم',
        variant: 'destructive',
      });
    }
  };

  if (isEditing && productLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/products')}
              className="text-slate-700 hover:bg-white/20"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                {isEditing ? 'ویرایش محصول' : 'محصول جدید'}
              </CardTitle>
              <p className="text-slate-600 mt-1">
                {isEditing ? 'اطلاعات محصول را ویرایش کنید' : 'محصول جدید را اضافه کنید'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>اطلاعات پایه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">نام محصول *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'نام محصول الزامی است' })}
                  placeholder="نام محصول را وارد کنید"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sku">کد محصول (SKU)</Label>
                <Input
                  id="sku"
                  {...register('sku')}
                  placeholder="کد محصول"
                />
              </div>

              <div>
                <Label htmlFor="barcode">بارکد</Label>
                <Input
                  id="barcode"
                  {...register('barcode')}
                  placeholder="بارکد محصول"
                />
              </div>

              <div>
                <Label htmlFor="category_id">دسته‌بندی</Label>
                <Select
                  value={watch('category_id') || 'none'}
                  onValueChange={(value) => setValue('category_id', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون دسته‌بندی</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="توضیحات محصول"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Type */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>نوع محصول</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('is_service')}
                  className="rounded border-gray-300"
                />
                <span>خدمات (بدون موجودی)</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('is_gold_product')}
                  className="rounded border-gray-300"
                />
                <span>محصول طلا</span>
              </label>
            </div>

            {watchIsGoldProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <Label htmlFor="gold_purity">عیار طلا *</Label>
                  <Input
                    id="gold_purity"
                    type="number"
                    step="0.001"
                    {...register('gold_purity', { 
                      required: watchIsGoldProduct ? 'عیار طلا الزامی است' : false,
                      min: { value: 0, message: 'عیار نمی‌تواند منفی باشد' },
                      max: { value: 24, message: 'عیار نمی‌تواند بیشتر از 24 باشد' }
                    })}
                    placeholder="مثال: 18.000"
                  />
                  {errors.gold_purity && (
                    <p className="text-sm text-red-600 mt-1">{errors.gold_purity.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="weight_per_unit">وزن هر واحد (گرم) *</Label>
                  <Input
                    id="weight_per_unit"
                    type="number"
                    step="0.001"
                    {...register('weight_per_unit', { 
                      required: watchIsGoldProduct ? 'وزن هر واحد الزامی است' : false,
                      min: { value: 0, message: 'وزن نمی‌تواند منفی باشد' }
                    })}
                    placeholder="وزن به گرم"
                  />
                  {errors.weight_per_unit && (
                    <p className="text-sm text-red-600 mt-1">{errors.weight_per_unit.message}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>قیمت‌گذاری</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="cost_price">قیمت تمام شده</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  {...register('cost_price', { min: { value: 0, message: 'قیمت نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
                {errors.cost_price && (
                  <p className="text-sm text-red-600 mt-1">{errors.cost_price.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="selling_price">قیمت فروش *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  {...register('selling_price', { 
                    required: 'قیمت فروش الزامی است',
                    min: { value: 0, message: 'قیمت نمی‌تواند منفی باشد' }
                  })}
                  placeholder="0"
                />
                {errors.selling_price && (
                  <p className="text-sm text-red-600 mt-1">{errors.selling_price.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="min_price">حداقل قیمت</Label>
                <Input
                  id="min_price"
                  type="number"
                  step="0.01"
                  {...register('min_price', { min: { value: 0, message: 'قیمت نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="max_price">حداکثر قیمت</Label>
                <Input
                  id="max_price"
                  type="number"
                  step="0.01"
                  {...register('max_price', { min: { value: 0, message: 'قیمت نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Management */}
        {!watchIsService && (
          <Card variant="professional">
            <CardHeader>
              <CardTitle>مدیریت موجودی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('track_inventory')}
                  className="rounded border-gray-300"
                />
                <span>پیگیری موجودی</span>
              </label>

              {watchTrackInventory && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stock_quantity">موجودی فعلی</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      {...register('stock_quantity', { 
                        min: { value: 0, message: 'موجودی نمی‌تواند منفی باشد' }
                      })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_stock_level">حداقل موجودی</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      {...register('min_stock_level', { 
                        min: { value: 0, message: 'حداقل موجودی نمی‌تواند منفی باشد' }
                      })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_stock_level">حداکثر موجودی</Label>
                    <Input
                      id="max_stock_level"
                      type="number"
                      {...register('max_stock_level', { 
                        min: { value: 0, message: 'حداکثر موجودی نمی‌تواند منفی باشد' }
                      })}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Images */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>تصاویر محصول</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images">آپلود تصاویر</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-1">
                می‌توانید چندین تصویر انتخاب کنید. فرمت‌های مجاز: JPG, PNG, WebP
              </p>
            </div>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`تصویر ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>اطلاعات تکمیلی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="manufacturer">تولیدکننده</Label>
                <Input
                  id="manufacturer"
                  {...register('manufacturer')}
                  placeholder="نام تولیدکننده"
                />
              </div>

              <div>
                <Label htmlFor="brand">برند</Label>
                <Input
                  id="brand"
                  {...register('brand')}
                  placeholder="نام برند"
                />
              </div>

              <div>
                <Label htmlFor="model">مدل</Label>
                <Input
                  id="model"
                  {...register('model')}
                  placeholder="مدل محصول"
                />
              </div>

              <div>
                <Label htmlFor="length">طول (سانتی‌متر)</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.01"
                  {...register('length', { min: { value: 0, message: 'طول نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="width">عرض (سانتی‌متر)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.01"
                  {...register('width', { min: { value: 0, message: 'عرض نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="height">ارتفاع (سانتی‌متر)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  {...register('height', { min: { value: 0, message: 'ارتفاع نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="weight">وزن (گرم)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register('weight', { min: { value: 0, message: 'وزن نمی‌تواند منفی باشد' } })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="status">وضعیت</Label>
                <Select
                  value={watch('status') || 'ACTIVE'}
                  onValueChange={(value) => setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">فعال</SelectItem>
                    <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                    <SelectItem value="DISCONTINUED">متوقف شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="notes">یادداشت‌ها</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="یادداشت‌های داخلی"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="gradient-green"
                disabled={isSubmitting || uploadingImages}
                className="flex items-center gap-2"
              >
                {isSubmitting || uploadingImages ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {uploadingImages ? 'آپلود تصاویر...' : 'در حال ذخیره...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditing ? 'به‌روزرسانی' : 'ایجاد محصول'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ProductForm;
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { productService, ProductCategory, ProductCategoryCreate, ProductCategoryUpdate } from '@/services/productService';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FolderTree,
  MoreHorizontal,
  Save
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const CategoryManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  
  const [formData, setFormData] = useState<ProductCategoryCreate>({
    name: '',
    description: '',
    parent_id: undefined,
    sort_order: 0
  });

  // Fetch categories
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productService.getCategories(),
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: (data: ProductCategoryCreate) => productService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({
        title: 'موفقیت',
        description: 'دسته‌بندی با موفقیت ایجاد شد',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductCategoryUpdate }) => 
      productService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({
        title: 'موفقیت',
        description: 'دسته‌بندی با موفقیت به‌روزرسانی شد',
      });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({
        title: 'موفقیت',
        description: 'دسته‌بندی با موفقیت حذف شد',
      });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_id: undefined,
      sort_order: 0
    });
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEdit = (category: ProductCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || undefined,
      sort_order: category.sort_order
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: formData });
    }
  };

  const confirmDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory.id);
    }
  };

  // Build hierarchical structure for display
  const buildCategoryTree = (categories: ProductCategory[]) => {
    type CategoryWithChildren = ProductCategory & { children: CategoryWithChildren[] };
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // Initialize all categories with children array
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build tree structure
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryWithChildren);
        } else {
          rootCategories.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  };

  const renderCategoryRow = (category: ProductCategory & { children: (ProductCategory & { children: any[] })[] }, level = 0) => {
    const rows = [];
    
    rows.push(
      <TableRow key={category.id}>
        <TableCell>
          <div className="flex items-center" style={{ paddingRight: `${level * 20}px` }}>
            {level > 0 && <span className="text-gray-400 ml-2">└─</span>}
            <FolderTree className="h-4 w-4 text-gray-500 ml-2" />
            <span className="font-medium">{category.name}</span>
          </div>
        </TableCell>
        <TableCell>{category.description || '-'}</TableCell>
        <TableCell>
          <Badge variant="secondary">{category.sort_order}</Badge>
        </TableCell>
        <TableCell>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            فعال
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(category)}>
                <Edit className="h-4 w-4 ml-2" />
                ویرایش
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(category)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );

    // Add children rows
    category.children.forEach(child => {
      rows.push(...renderCategoryRow(child, level + 1));
    });

    return rows;
  };

  if (error) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            خطا در بارگذاری دسته‌بندی‌ها: {(error as Error).message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryTree = categories ? buildCategoryTree(categories) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">مدیریت دسته‌بندی‌ها</h3>
          <p className="text-gray-600">دسته‌بندی‌های محصولات را مدیریت کنید</p>
        </div>
        <Button
          variant="gradient-green"
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          دسته‌بندی جدید
        </Button>
      </div>

      {/* Categories Table */}
      <Card variant="professional">
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
            </div>
          ) : categoryTree.length === 0 ? (
            <div className="text-center py-8">
              <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">هیچ دسته‌بندی‌ای یافت نشد</p>
              <Button
                variant="gradient-green"
                onClick={handleCreate}
                className="mt-4"
              >
                اولین دسته‌بندی را اضافه کنید
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام دسته‌بندی</TableHead>
                    <TableHead>توضیحات</TableHead>
                    <TableHead>ترتیب</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryTree.map(category => renderCategoryRow(category))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دسته‌بندی جدید</DialogTitle>
            <DialogDescription>
              دسته‌بندی جدید برای محصولات ایجاد کنید
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-name">نام دسته‌بندی *</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="نام دسته‌بندی"
                  required
                />
              </div>

              <div>
                <Label htmlFor="create-description">توضیحات</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="توضیحات دسته‌بندی"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="create-parent">دسته‌بندی والد</Label>
                <Select
                  value={formData.parent_id || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    parent_id: value === 'none' ? undefined : value 
                  }))}
                >
                  <SelectTrigger id="create-parent">
                    <SelectValue placeholder="انتخاب دسته‌بندی والد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون والد (دسته‌بندی اصلی)</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="create-sort-order">ترتیب نمایش</Label>
                <Input
                  id="create-sort-order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sort_order: parseInt(e.target.value) || 0 
                  }))}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="gradient-green"
                disabled={createMutation.isPending}
                className="flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    در حال ایجاد...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    ایجاد
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش دسته‌بندی</DialogTitle>
            <DialogDescription>
              اطلاعات دسته‌بندی را ویرایش کنید
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">نام دسته‌بندی *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="نام دسته‌بندی"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">توضیحات</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="توضیحات دسته‌بندی"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-parent">دسته‌بندی والد</Label>
                <Select
                  value={formData.parent_id || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    parent_id: value === 'none' ? undefined : value 
                  }))}
                >
                  <SelectTrigger id="edit-parent">
                    <SelectValue placeholder="انتخاب دسته‌بندی والد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون والد (دسته‌بندی اصلی)</SelectItem>
                    {categories?.filter(c => c.id !== selectedCategory?.id).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-sort-order">ترتیب نمایش</Label>
                <Input
                  id="edit-sort-order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sort_order: parseInt(e.target.value) || 0 
                  }))}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="gradient-green"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    در حال به‌روزرسانی...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    به‌روزرسانی
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف دسته‌بندی</DialogTitle>
            <DialogDescription>
              آیا مطمئن هستید که می‌خواهید دسته‌بندی "{selectedCategory?.name}" را حذف کنید؟
              این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'در حال حذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagement;
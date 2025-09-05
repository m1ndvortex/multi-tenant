import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Users, UserCheck, Crown, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { customerService, Customer, CustomerSearchParams } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

interface CustomerListProps {
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: () => void;
  onShowSegmentation?: () => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer, onCreateCustomer, onShowSegmentation }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [debtFilter, setDebtFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: CustomerSearchParams = {
        query: searchQuery || undefined,
        status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
        customer_type: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
        has_debt: debtFilter === 'with_debt' ? true : debtFilter === 'no_debt' ? false : undefined,
        page: currentPage,
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      const response = await customerService.getCustomers(params);
      setCustomers(response.customers);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری لیست مشتریان',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery, statusFilter, typeFilter, debtFilter, currentPage]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'type':
        setTypeFilter(value);
        break;
      case 'debt':
        setDebtFilter(value);
        break;
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDebtFilter('all');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">فعال</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">غیرفعال</Badge>;
      case 'BLOCKED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">مسدود</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">شخصی</Badge>;
      case 'BUSINESS':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">تجاری</Badge>;
      case 'VIP':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">VIP</Badge>;
      default:
        return <Badge>{type}</Badge>;
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
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">مدیریت مشتریان</h1>
            <p className="text-sm text-gray-500">مدیریت اطلاعات مشتریان و تعاملات</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onShowSegmentation && (
            <Button 
              onClick={onShowSegmentation}
              variant="outline" 
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              بخش‌بندی و بازاریابی
            </Button>
          )}
          <Button 
            onClick={onCreateCustomer}
            variant="gradient-green" 
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            مشتری جدید
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="gradient-green">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">کل مشتریان</p>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="gradient-blue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">مشتریان فعال</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="gradient-purple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">مشتریان VIP</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.customer_type === 'VIP').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">دارای بدهی</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.has_outstanding_debt).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در نام، ایمیل، تلفن..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="ACTIVE">فعال</SelectItem>
                  <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                  <SelectItem value="BLOCKED">مسدود</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="نوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="INDIVIDUAL">شخصی</SelectItem>
                  <SelectItem value="BUSINESS">تجاری</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>

              <Select value={debtFilter} onValueChange={(value) => handleFilterChange('debt', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="بدهی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="with_debt">دارای بدهی</SelectItem>
                  <SelectItem value="no_debt">بدون بدهی</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4 ml-2" />
                پاک کردن
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card variant="professional">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام مشتری</TableHead>
                <TableHead>اطلاعات تماس</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>بدهی ریالی</TableHead>
                <TableHead>بدهی طلا</TableHead>
                <TableHead>آخرین خرید</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    در حال بارگذاری...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    مشتری یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => onSelectCustomer(customer)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.display_name}</div>
                        {customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {customer.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {customer.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{customer.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{customer.primary_contact}</div>
                        {customer.city && (
                          <div className="text-gray-500">{customer.city}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(customer.customer_type)}</TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      {customer.total_debt > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(customer.total_debt)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.total_gold_debt > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {formatGoldWeight(customer.total_gold_debt)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.last_purchase_at ? (
                        <span className="text-sm text-gray-600">
                          {new Date(customer.last_purchase_at).toLocaleDateString('fa-IR')}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(customer);
                        }}
                      >
                        مشاهده
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            قبلی
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            صفحه {currentPage} از {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
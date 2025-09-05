/**
 * Journal Entries list and management component
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, CheckCircle, Clock, FileText, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { accountingService, JournalEntry } from '@/services/accountingService';
import { JournalEntryForm } from './JournalEntryForm';
import { JournalEntryView } from './JournalEntryView';

export const JournalEntries: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'unposted'>('all');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showEntryView, setShowEntryView] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const pageSize = 50;

  useEffect(() => {
    loadJournalEntries(true);
  }, [statusFilter]);

  const loadJournalEntries = async (reset: boolean = false) => {
    try {
      setLoading(true);
      const skip = reset ? 0 : currentPage * pageSize;
      const postedOnly = statusFilter === 'posted';
      
      const newEntries = await accountingService.getJournalEntries(skip, pageSize, postedOnly);
      
      if (reset) {
        setEntries(newEntries);
        setCurrentPage(0);
      } else {
        setEntries(prev => [...prev, ...newEntries]);
      }
      
      setHasMore(newEntries.length === pageSize);
      if (!reset) {
        setCurrentPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری اسناد حسابداری',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setShowEntryForm(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    if (entry.is_posted) {
      toast({
        title: 'خطا',
        description: 'امکان ویرایش سند ثبت شده وجود ندارد',
        variant: 'destructive',
      });
      return;
    }
    
    setEditingEntry(entry);
    setShowEntryForm(true);
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setViewingEntry(entry);
    setShowEntryView(true);
  };

  const handlePostEntry = async (entry: JournalEntry) => {
    if (entry.is_posted) {
      return;
    }

    if (!confirm(`آیا از ثبت سند "${entry.entry_number}" اطمینان دارید؟`)) {
      return;
    }

    try {
      await accountingService.postJournalEntry(entry.id!);
      toast({
        title: 'موفقیت',
        description: 'سند با موفقیت ثبت شد',
      });
      loadJournalEntries(true);
    } catch (error) {
      console.error('Error posting journal entry:', error);
      toast({
        title: 'خطا',
        description: 'خطا در ثبت سند',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEntry = async (entry: JournalEntry) => {
    if (entry.is_posted) {
      toast({
        title: 'خطا',
        description: 'امکان حذف سند ثبت شده وجود ندارد',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`آیا از حذف سند "${entry.entry_number}" اطمینان دارید؟`)) {
      return;
    }

    try {
      await accountingService.deleteJournalEntry(entry.id!);
      toast({
        title: 'موفقیت',
        description: 'سند با موفقیت حذف شد',
      });
      loadJournalEntries(true);
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast({
        title: 'خطا',
        description: 'خطا در حذف سند',
        variant: 'destructive',
      });
    }
  };

  const handleEntrySaved = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
    loadJournalEntries(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'posted' && entry.is_posted) ||
      (statusFilter === 'unposted' && !entry.is_posted);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              اسناد حسابداری
            </CardTitle>
            
            <Button
              onClick={handleCreateEntry}
              variant="gradient-green"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              سند جدید
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در اسناد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه اسناد</SelectItem>
                  <SelectItem value="posted">ثبت شده</SelectItem>
                  <SelectItem value="unposted">ثبت نشده</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>هیچ سند حسابداری یافت نشد</p>
              <Button
                onClick={handleCreateEntry}
                variant="outline"
                className="mt-4"
              >
                اولین سند را ایجاد کنید
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {entry.is_posted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-orange-500" />
                      )}
                      
                      <div>
                        <div className="font-medium text-slate-900">
                          {entry.entry_number}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatDate(entry.entry_date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-slate-900 mb-1">
                        {entry.description}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.is_posted ? 'default' : 'secondary'}>
                          {entry.is_posted ? 'ثبت شده' : 'ثبت نشده'}
                        </Badge>
                        
                        {entry.reference_type && (
                          <Badge variant="outline">
                            {entry.reference_type}
                          </Badge>
                        )}
                        
                        {entry.reference_number && (
                          <span className="text-sm text-slate-500">
                            مرجع: {entry.reference_number}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-left">
                      <div className="font-medium text-slate-900">
                        {formatCurrency(entry.total_debit)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {entry.lines.length} ردیف
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewEntry(entry)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {!entry.is_posted && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePostEntry(entry)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    onClick={() => loadJournalEntries(false)}
                    variant="outline"
                    disabled={loading}
                  >
                    {loading ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {showEntryForm && (
        <JournalEntryForm
          entry={editingEntry}
          onSave={handleEntrySaved}
          onCancel={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
          }}
        />
      )}
      
      {showEntryView && viewingEntry && (
        <JournalEntryView
          entry={viewingEntry}
          onClose={() => {
            setShowEntryView(false);
            setViewingEntry(null);
          }}
          onEdit={() => {
            setShowEntryView(false);
            handleEditEntry(viewingEntry);
          }}
          onPost={() => {
            setShowEntryView(false);
            handlePostEntry(viewingEntry);
          }}
          onDelete={() => {
            setShowEntryView(false);
            handleDeleteEntry(viewingEntry);
          }}
        />
      )}
    </>
  );
};
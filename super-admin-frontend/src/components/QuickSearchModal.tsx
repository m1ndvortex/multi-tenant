import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  id: string;
  type: 'tenant' | 'user';
  title: string;
  subtitle: string;
  url: string;
  metadata?: {
    status?: string;
    subscription?: string;
    last_login?: string;
  };
}

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const searchItems = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return [];
  
  const response = await fetch(`/api/super-admin/search?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to search');
  }

  return response.json();
};

const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchItems(query),
    enabled: query.length > 2,
    staleTime: 30000,
  });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          event.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelectResult(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.url);
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'tenant':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getStatusBadge = (result: SearchResult) => {
    if (result.type === 'tenant' && result.metadata?.status) {
      const status = result.metadata.status;
      const statusColors = {
        active: 'bg-green-100 text-green-700',
        suspended: 'bg-red-100 text-red-700',
        pending: 'bg-yellow-100 text-yellow-700',
      };
      
      return (
        <span className={cn(
          "px-2 py-1 text-xs rounded-full font-medium",
          statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'
        )}>
          {status === 'active' ? 'فعال' : 
           status === 'suspended' ? 'معلق' : 
           status === 'pending' ? 'در انتظار' : status}
        </span>
      );
    }
    
    if (result.type === 'user' && result.metadata?.last_login) {
      const lastLogin = new Date(result.metadata.last_login);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return (
          <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700">
            آنلاین
          </span>
        );
      }
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-0">
        <CardContent className="p-0">
          {/* Search Input */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی تنانت‌ها، کاربران و..."
                className="w-full pr-10 pl-4 py-3 text-lg border-0 focus:outline-none focus:ring-0 bg-transparent"
                dir="rtl"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">جستجوی سراسری</h3>
                <p className="text-slate-600 mb-4">تنانت‌ها، کاربران و سایر موارد را جستجو کنید</p>
                <div className="text-sm text-slate-500">
                  <p>نکات:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• حداقل 3 کاراکتر تایپ کنید</li>
                    <li>• از کلیدهای ↑↓ برای حرکت استفاده کنید</li>
                    <li>• Enter برای انتخاب، Escape برای بستن</li>
                  </ul>
                </div>
              </div>
            ) : query.length < 3 ? (
              <div className="p-8 text-center">
                <p className="text-slate-600">حداقل 3 کاراکتر تایپ کنید...</p>
              </div>
            ) : isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 text-right hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0",
                      index === selectedIndex && "bg-blue-50 border-blue-200"
                    )}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        {getResultIcon(result.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-slate-800 truncate">
                          {result.title}
                        </h4>
                        {getStatusBadge(result)}
                      </div>
                      <p className="text-sm text-slate-600 truncate mt-1">
                        {result.subtitle}
                      </p>
                      {result.metadata?.subscription && (
                        <p className="text-xs text-slate-500 mt-1">
                          اشتراک: {result.metadata.subscription}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-600">نتیجه‌ای یافت نشد</p>
                <p className="text-sm text-slate-500 mt-1">
                  کلمات کلیدی دیگری امتحان کنید
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">↑↓</kbd>
                  حرکت
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">Enter</kbd>
                  انتخاب
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">Esc</kbd>
                  بستن
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                بستن
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickSearchModal;
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {/* First Page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>

      {/* Previous Page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Page Numbers */}
      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-2 text-slate-500">...</span>
          ) : (
            <Button
              variant={currentPage === page ? 'gradient-green' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      {/* Next Page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Last Page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Pagination;
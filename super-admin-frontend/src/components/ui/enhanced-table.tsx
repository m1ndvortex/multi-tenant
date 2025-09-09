/**
 * Enhanced Table Component
 * Provides improved styling with better spacing and readability, especially for tenant names
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedTableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      variant: {
        default: "border-collapse",
        striped: "border-collapse",
        bordered: "border-collapse border border-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const enhancedTableContainerVariants = cva(
  "relative w-full overflow-auto rounded-lg shadow-sm",
  {
    variants: {
      variant: {
        default: "border border-gray-200 bg-white",
        elevated: "border border-gray-200 bg-white shadow-lg",
        minimal: "bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface EnhancedTableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof enhancedTableVariants> {}

export interface EnhancedTableContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedTableContainerVariants> {}

const EnhancedTableContainer = React.forwardRef<HTMLDivElement, EnhancedTableContainerProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(enhancedTableContainerVariants({ variant, className }))}
      {...props}
    />
  )
);
EnhancedTableContainer.displayName = "EnhancedTableContainer";

const EnhancedTable = React.forwardRef<HTMLTableElement, EnhancedTableProps>(
  ({ className, variant, ...props }, ref) => (
    <table
      ref={ref}
      className={cn(enhancedTableVariants({ variant, className }))}
      {...props}
    />
  )
);
EnhancedTable.displayName = "EnhancedTable";

const EnhancedTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200",
      className
    )}
    {...props}
  />
));
EnhancedTableHeader.displayName = "EnhancedTableHeader";

const EnhancedTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-gray-100", className)}
    {...props}
  />
));
EnhancedTableBody.displayName = "EnhancedTableBody";

const EnhancedTableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 font-medium",
      className
    )}
    {...props}
  />
));
EnhancedTableFooter.displayName = "EnhancedTableFooter";

const EnhancedTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-gray-100 transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-blue-50",
      className
    )}
    {...props}
  />
));
EnhancedTableRow.displayName = "EnhancedTableRow";

const enhancedTableHeadVariants = cva(
  "h-12 px-6 text-right align-middle font-bold text-gray-900 tracking-wide",
  {
    variants: {
      variant: {
        default: "text-sm",
        large: "text-base",
        small: "text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface EnhancedTableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof enhancedTableHeadVariants> {}

const EnhancedTableHead = React.forwardRef<HTMLTableCellElement, EnhancedTableHeadProps>(
  ({ className, variant, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(enhancedTableHeadVariants({ variant, className }))}
      {...props}
    />
  )
);
EnhancedTableHead.displayName = "EnhancedTableHead";

const enhancedTableCellVariants = cva(
  "px-6 py-4 align-middle text-gray-900 font-medium",
  {
    variants: {
      variant: {
        default: "text-sm",
        large: "text-base",
        small: "text-xs",
        // Special variant for tenant names with high contrast
        "tenant-name": "text-sm font-bold text-blue-800 bg-blue-50/30",
        // Important data variant
        important: "text-sm font-bold text-gray-900",
        // Muted variant for secondary information
        muted: "text-sm font-normal text-gray-600",
        // Status variants
        success: "text-sm font-semibold text-green-800 bg-green-50/30",
        warning: "text-sm font-semibold text-yellow-800 bg-yellow-50/30",
        error: "text-sm font-semibold text-red-800 bg-red-50/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface EnhancedTableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof enhancedTableCellVariants> {}

const EnhancedTableCell = React.forwardRef<HTMLTableCellElement, EnhancedTableCellProps>(
  ({ className, variant, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(enhancedTableCellVariants({ variant, className }))}
      {...props}
    />
  )
);
EnhancedTableCell.displayName = "EnhancedTableCell";

const EnhancedTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-gray-600 font-medium", className)}
    {...props}
  />
));
EnhancedTableCaption.displayName = "EnhancedTableCaption";

// Utility component for tenant name cells with maximum visibility
export interface TenantNameCellProps extends EnhancedTableCellProps {
  tenantName: string;
}

const TenantNameCell = React.forwardRef<HTMLTableCellElement, TenantNameCellProps>(
  ({ tenantName, className, ...props }, ref) => (
    <EnhancedTableCell
      ref={ref}
      variant="tenant-name"
      className={cn("tenant-name-cell", className)}
      {...props}
    >
      <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded-md">
        {tenantName}
      </span>
    </EnhancedTableCell>
  )
);
TenantNameCell.displayName = "TenantNameCell";

export {
  EnhancedTable,
  EnhancedTableContainer,
  EnhancedTableHeader,
  EnhancedTableBody,
  EnhancedTableFooter,
  EnhancedTableHead,
  EnhancedTableRow,
  EnhancedTableCell,
  EnhancedTableCaption,
  TenantNameCell,
  enhancedTableVariants,
  enhancedTableContainerVariants,
  enhancedTableHeadVariants,
  enhancedTableCellVariants,
};
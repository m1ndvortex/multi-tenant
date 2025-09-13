import * as React from "react"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      variant: {
        default: "",
        cyber: "text-white/90",
        glass: "text-white/90 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const tableContainerVariants = cva(
  "relative w-full overflow-auto",
  {
    variants: {
      variant: {
        default: "",
        cyber: "bg-gradient-to-br from-[#0B0E1A] to-[#1A1D29] rounded-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        glass: "backdrop-blur-md bg-white/5 rounded-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  containerVariant?: VariantProps<typeof tableContainerVariants>['variant'];
  animated?: boolean;
  rtl?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, containerVariant, animated = false, rtl = false, ...props }, ref) => {
    const tableContent = (
      <table
        ref={ref}
        className={cn(
          tableVariants({ variant }),
          rtl && "font-[Vazirmatn] [&_th]:text-right [&_td]:text-right",
          className
        )}
        {...props}
      />
    );

    return (
      <div className={cn(tableContainerVariants({ variant: containerVariant || variant }))}>
        {animated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {tableContent}
          </motion.div>
        ) : (
          tableContent
        )}
      </div>
    );
  }
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    variant?: 'default' | 'cyber' | 'glass';
    rtl?: boolean;
  }
>(({ className, variant = 'default', rtl = false, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      variant === 'default' && "bg-gradient-to-r from-slate-50 to-slate-100",
      variant === 'cyber' && "bg-gradient-to-r from-[#00D4FF]/10 to-[#00FF88]/10 border-b border-[#00D4FF]/20 shadow-[0_0_15px_rgba(0,212,255,0.1)]",
      variant === 'glass' && "bg-white/5 border-b border-white/10 backdrop-blur-sm",
      rtl && "font-[Vazirmatn]",
      className
    )} 
    {...props} 
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    animated?: boolean;
    rtl?: boolean;
  }
>(({ className, animated = false, rtl = false, ...props }, ref) => {
  const bodyContent = (
    <tbody
      ref={ref}
      className={cn(
        "[&_tr:last-child]:border-0",
        rtl && "font-[Vazirmatn]",
        className
      )}
      {...props}
    />
  );

  if (animated) {
    return (
      <motion.tbody
        ref={ref}
        className={cn(
          "[&_tr:last-child]:border-0",
          rtl && "font-[Vazirmatn]",
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, staggerChildren: 0.05 }}
      >
        {props.children}
      </motion.tbody>
    );
  }

  return bodyContent;
});
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    variant?: 'default' | 'cyber' | 'glass';
    rtl?: boolean;
  }
>(({ className, variant = 'default', rtl = false, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t font-medium [&>tr]:last:border-b-0",
      variant === 'default' && "bg-slate-100/50",
      variant === 'cyber' && "bg-gradient-to-r from-[#00D4FF]/5 to-[#00FF88]/5 border-t-[#00D4FF]/20",
      variant === 'glass' && "bg-white/5 border-t-white/10",
      rtl && "font-[Vazirmatn]",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    variant?: 'default' | 'cyber' | 'glass';
    animated?: boolean;
    rtl?: boolean;
  }
>(({ className, variant = 'default', animated = false, rtl = false, ...props }, ref) => {
  const rowClasses = cn(
    "border-b transition-all duration-300",
    variant === 'default' && "hover:bg-slate-50/50 data-[state=selected]:bg-slate-100",
    variant === 'cyber' && "border-white/5 hover:bg-gradient-to-r hover:from-[#00D4FF]/5 hover:to-[#00FF88]/5 hover:shadow-[0_0_15px_rgba(0,212,255,0.1)] data-[state=selected]:bg-[#00D4FF]/10",
    variant === 'glass' && "border-white/5 hover:bg-white/5 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] data-[state=selected]:bg-white/10",
    rtl && "font-[Vazirmatn]",
    className
  );

  if (animated) {
    return (
      <motion.tr
        ref={ref}
        className={rowClasses}
        initial={{ opacity: 0, x: rtl ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {props.children}
      </motion.tr>
    );
  }

  return (
    <tr
      ref={ref}
      className={rowClasses}
      {...props}
    />
  );
});
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    variant?: 'default' | 'cyber' | 'glass';
    sortable?: boolean;
    rtl?: boolean;
  }
>(({ className, variant = 'default', sortable = false, rtl = false, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 align-middle font-medium [&:has([role=checkbox])]:pr-0",
      variant === 'default' && "text-slate-500 text-right",
      variant === 'cyber' && "text-[#00D4FF] text-right font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]",
      variant === 'glass' && "text-white/90 text-right font-semibold",
      sortable && "cursor-pointer hover:text-opacity-80 select-none",
      rtl && "text-right font-[Vazirmatn]",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    variant?: 'default' | 'cyber' | 'glass';
    rtl?: boolean;
  }
>(({ className, variant = 'default', rtl = false, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      variant === 'cyber' && "text-white/90",
      variant === 'glass' && "text-white/90",
      rtl && "font-[Vazirmatn] text-right",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement> & {
    variant?: 'default' | 'cyber' | 'glass';
    rtl?: boolean;
  }
>(({ className, variant = 'default', rtl = false, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-sm",
      variant === 'default' && "text-slate-500",
      variant === 'cyber' && "text-white/70",
      variant === 'glass' && "text-white/70",
      rtl && "font-[Vazirmatn]",
      className
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// Predefined cybersecurity table components
export const CyberTable: React.FC<{
  children: React.ReactNode;
  animated?: boolean;
  rtl?: boolean;
  className?: string;
}> = ({ children, animated = true, rtl = false, className }) => {
  return (
    <Table 
      variant="cyber" 
      containerVariant="cyber"
      animated={animated}
      rtl={rtl}
      className={className}
    >
      {children}
    </Table>
  );
};

export const GlassTable: React.FC<{
  children: React.ReactNode;
  animated?: boolean;
  rtl?: boolean;
  className?: string;
}> = ({ children, animated = true, rtl = false, className }) => {
  return (
    <Table 
      variant="glass" 
      containerVariant="glass"
      animated={animated}
      rtl={rtl}
      className={className}
    >
      {children}
    </Table>
  );
};

export const DataTable: React.FC<{
  headers: string[];
  data: any[][];
  variant?: 'default' | 'cyber' | 'glass';
  animated?: boolean;
  rtl?: boolean;
  onRowClick?: (rowIndex: number) => void;
}> = ({ 
  headers, 
  data, 
  variant = 'cyber', 
  animated = true, 
  rtl = false,
  onRowClick 
}) => {
  return (
    <Table variant={variant} containerVariant={variant} animated={animated} rtl={rtl}>
      <TableHeader variant={variant} rtl={rtl}>
        <TableRow variant={variant} rtl={rtl}>
          {headers.map((header, index) => (
            <TableHead key={index} variant={variant} rtl={rtl}>
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody animated={animated} rtl={rtl}>
        {data.map((row, rowIndex) => (
          <TableRow 
            key={rowIndex} 
            variant={variant} 
            animated={animated} 
            rtl={rtl}
            onClick={() => onRowClick?.(rowIndex)}
            className={onRowClick ? "cursor-pointer" : ""}
          >
            {row.map((cell, cellIndex) => (
              <TableCell key={cellIndex} variant={variant} rtl={rtl}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
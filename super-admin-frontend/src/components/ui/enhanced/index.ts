/**
 * Enhanced UI Components Index
 * Exports all enhanced components with improved typography and colors
 */

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
  enhancedCardVariants,
} from '../enhanced-card';

export {
  EnhancedButton,
  enhancedButtonVariants,
} from '../enhanced-button';

export {
  EnhancedInput,
  EnhancedSearchInput,
  enhancedInputVariants,
} from '../enhanced-input';

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
} from '../enhanced-table';

// Re-export theme utilities
export { typography, textColors, typographyClasses, accessibleCombinations } from '../../../lib/theme/typography';
export { colors, colorUtils, cssVariables } from '../../../lib/theme/colors';
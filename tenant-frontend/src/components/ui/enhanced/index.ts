/**
 * Enhanced UI Components Index for Tenant Frontend
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
  EnhancedInput,
  EnhancedSearchInput,
  enhancedInputVariants,
} from '../enhanced-input';

// Re-export theme utilities
export { typography, textColors, typographyClasses, accessibleCombinations } from '../../../lib/theme/typography';
export { colors, colorUtils, cssVariables } from '../../../lib/theme/colors';
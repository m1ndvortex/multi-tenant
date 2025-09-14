/**
 * Accessibility Testing Utilities for Cybersecurity Form Components
 * Ensures WCAG 2.1 AA compliance for all form elements
 */

export interface AccessibilityTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export class AccessibilityTester {
  private static readonly WCAG_AA_CONTRAST_RATIO = 4.5;
  private static readonly WCAG_AAA_CONTRAST_RATIO = 7;

  /**
   * Test color contrast ratio
   */
  static testColorContrast(foreground: string, background: string): {
    ratio: number;
    passesAA: boolean;
    passesAAA: boolean;
  } {
    const ratio = this.calculateContrastRatio(foreground, background);
    return {
      ratio,
      passesAA: ratio >= this.WCAG_AA_CONTRAST_RATIO,
      passesAAA: ratio >= this.WCAG_AAA_CONTRAST_RATIO,
    };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private static calculateContrastRatio(color1: string, color2: string): number {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private static getLuminance(color: string): number {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    // Calculate relative luminance
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  /**
   * Test form element accessibility
   */
  static testFormElement(element: HTMLElement): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Test for required attributes
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
      // Check for label association
      const elementId = element.getAttribute('id');
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      
      if (!elementId && !ariaLabel && !ariaLabelledBy) {
        errors.push('Form element must have an associated label, aria-label, or aria-labelledby');
        score -= 20;
      }

      if (elementId) {
        const label = document.querySelector(`label[for="${elementId}"]`);
        if (!label && !ariaLabel && !ariaLabelledBy) {
          errors.push('Form element with ID must have a corresponding label');
          score -= 15;
        }
      }

      // Check for required field indication
      const required = element.getAttribute('required');
      const ariaRequired = element.getAttribute('aria-required');
      
      if (required && !ariaRequired) {
        warnings.push('Required fields should have aria-required="true"');
        score -= 5;
      }

      // Check for error indication
      const ariaInvalid = element.getAttribute('aria-invalid');
      const ariaDescribedBy = element.getAttribute('aria-describedby');
      
      if (ariaInvalid === 'true' && !ariaDescribedBy) {
        errors.push('Invalid fields must have aria-describedby pointing to error message');
        score -= 15;
      }

      // Check for placeholder accessibility
      const placeholder = element.getAttribute('placeholder');
      if (placeholder && !ariaLabel && !elementId) {
        warnings.push('Placeholder text should not be the only form of labeling');
        score -= 10;
      }
    }

    // Test keyboard accessibility
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex && parseInt(tabIndex) > 0) {
      warnings.push('Avoid positive tabindex values; use 0 or -1');
      score -= 5;
    }

    // Test focus visibility
    const computedStyle = window.getComputedStyle(element);
    const outline = computedStyle.outline;
    const outlineWidth = computedStyle.outlineWidth;
    
    if (outline === 'none' && outlineWidth === '0px') {
      // Check for custom focus styles
      const boxShadow = computedStyle.boxShadow;
      const border = computedStyle.border;
      
      if (!boxShadow.includes('rgba') && !border.includes('rgba')) {
        warnings.push('Element should have visible focus indicator');
        score -= 10;
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Test cybersecurity theme colors for accessibility
   */
  static testCyberSecurityColors(): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const colorTests = [
      // Primary colors against dark background
      { name: 'Cyan on Dark', fg: '#00D4FF', bg: '#0B0E1A' },
      { name: 'Green on Dark', fg: '#00FF88', bg: '#0B0E1A' },
      { name: 'Orange on Dark', fg: '#FF6B35', bg: '#0B0E1A' },
      { name: 'Red on Dark', fg: '#FF4757', bg: '#0B0E1A' },
      { name: 'White on Dark', fg: '#FFFFFF', bg: '#0B0E1A' },
      { name: 'Light Gray on Dark', fg: '#B8BCC8', bg: '#0B0E1A' },
      
      // Colors on glass backgrounds
      { name: 'White on Glass', fg: '#FFFFFF', bg: '#252A3A' },
      { name: 'Cyan on Glass', fg: '#00D4FF', bg: '#252A3A' },
      { name: 'Green on Glass', fg: '#00FF88', bg: '#252A3A' },
    ];

    colorTests.forEach(test => {
      const contrast = this.testColorContrast(test.fg, test.bg);
      
      if (!contrast.passesAA) {
        errors.push(`${test.name} contrast ratio ${contrast.ratio.toFixed(2)} fails WCAG AA (4.5:1)`);
        score -= 15;
      } else if (!contrast.passesAAA) {
        warnings.push(`${test.name} contrast ratio ${contrast.ratio.toFixed(2)} passes AA but fails AAA (7:1)`);
        score -= 5;
      }
    });

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Test form validation accessibility
   */
  static testFormValidation(formElement: HTMLFormElement): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Find all form controls
    const formControls = formElement.querySelectorAll('input, textarea, select');
    
    formControls.forEach((control, index) => {
      const element = control as HTMLElement;
      // const elementId = element.getAttribute('id'); // Unused for now
      
      // Check for error message association
      const ariaDescribedBy = element.getAttribute('aria-describedby');
      if (ariaDescribedBy) {
        const errorElement = document.getElementById(ariaDescribedBy);
        if (!errorElement) {
          errors.push(`Form control ${index + 1} references non-existent error element`);
          score -= 10;
        } else {
          // Check if error message is properly announced
          const role = errorElement.getAttribute('role');
          const ariaLive = errorElement.getAttribute('aria-live');
          
          if (!role && !ariaLive) {
            warnings.push(`Error message for control ${index + 1} should have role="alert" or aria-live`);
            score -= 5;
          }
        }
      }

      // Check for fieldset grouping
      const fieldset = element.closest('fieldset');
      if (!fieldset && formControls.length > 5) {
        warnings.push('Complex forms should group related fields in fieldsets');
        score -= 3;
      }
    });

    // Check for form submission feedback
    const submitButton = formElement.querySelector('button[type="submit"]');
    if (submitButton) {
      const ariaDescribedBy = submitButton.getAttribute('aria-describedby');
      if (!ariaDescribedBy) {
        warnings.push('Submit button should indicate loading state to screen readers');
        score -= 5;
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Test keyboard navigation
   */
  static testKeyboardNavigation(container: HTMLElement): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Find all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) {
      warnings.push('No focusable elements found');
      return { passed: true, errors, warnings, score: 80 };
    }

    // Check tab order
    const tabIndexes: number[] = [];
    focusableElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      const parsedTabIndex = tabIndex ? parseInt(tabIndex) : 0;
      tabIndexes.push(parsedTabIndex);

      // Check for skip links
      if (index === 0 && element.textContent?.toLowerCase().includes('skip')) {
        // Good practice
      } else if (parsedTabIndex > 0) {
        warnings.push(`Element ${index + 1} has positive tabindex (${parsedTabIndex})`);
        score -= 5;
      }
    });

    // Check for keyboard traps
    const hasModal = container.querySelector('[role="dialog"], [role="alertdialog"]');
    if (hasModal) {
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      if (!firstFocusable || !lastFocusable) {
        errors.push('Modal dialogs must have focusable elements for keyboard trapping');
        score -= 20;
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Test RTL (Right-to-Left) accessibility
   */
  static testRTLAccessibility(element: HTMLElement): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const dir = element.getAttribute('dir') || document.documentElement.getAttribute('dir');
    const lang = element.getAttribute('lang') || document.documentElement.getAttribute('lang');

    if (dir === 'rtl') {
      // Check for proper RTL styling
      const computedStyle = window.getComputedStyle(element);
      const textAlign = computedStyle.textAlign;
      const direction = computedStyle.direction;

      if (direction !== 'rtl') {
        errors.push('Element with dir="rtl" should have CSS direction: rtl');
        score -= 15;
      }

      // Check for RTL-appropriate text alignment
      if (textAlign === 'left') {
        warnings.push('RTL elements should typically use text-align: right or start');
        score -= 5;
      }

      // Check for proper language declaration
      if (!lang || !lang.includes('ar') && !lang.includes('fa') && !lang.includes('he')) {
        warnings.push('RTL elements should declare appropriate language');
        score -= 5;
      }
    }

    // Check for mixed content handling
    const hasNumbers = /\d/.test(element.textContent || '');
    const hasEnglish = /[a-zA-Z]/.test(element.textContent || '');
    
    if (dir === 'rtl' && hasNumbers && hasEnglish) {
      warnings.push('Mixed RTL/LTR content may need explicit directional markup');
      score -= 3;
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Comprehensive accessibility audit
   */
  static auditForm(formElement: HTMLFormElement): {
    overall: AccessibilityTestResult;
    details: {
      colorContrast: AccessibilityTestResult;
      formValidation: AccessibilityTestResult;
      keyboardNavigation: AccessibilityTestResult;
      rtlSupport: AccessibilityTestResult;
      elements: AccessibilityTestResult[];
    };
  } {
    const colorContrast = this.testCyberSecurityColors();
    const formValidation = this.testFormValidation(formElement);
    const keyboardNavigation = this.testKeyboardNavigation(formElement);
    const rtlSupport = this.testRTLAccessibility(formElement);

    // Test individual form elements
    const formControls = formElement.querySelectorAll('input, textarea, select, button');
    const elements = Array.from(formControls).map(element => 
      this.testFormElement(element as HTMLElement)
    );

    // Calculate overall score
    const allTests = [colorContrast, formValidation, keyboardNavigation, rtlSupport, ...elements];
    const averageScore = allTests.reduce((sum, test) => sum + test.score, 0) / allTests.length;
    
    const allErrors = allTests.flatMap(test => test.errors);
    const allWarnings = allTests.flatMap(test => test.warnings);

    return {
      overall: {
        passed: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        score: Math.round(averageScore),
      },
      details: {
        colorContrast,
        formValidation,
        keyboardNavigation,
        rtlSupport,
        elements,
      },
    };
  }
}

/**
 * Accessibility testing utilities for React components
 */
export const ReactAccessibilityTester = {
  /**
   * Test React form component accessibility
   */
  testReactForm: (formRef: React.RefObject<HTMLFormElement>) => {
    if (!formRef.current) {
      throw new Error('Form ref is not attached to a DOM element');
    }
    
    return AccessibilityTester.auditForm(formRef.current);
  },

  /**
   * Generate accessibility report
   */
  generateReport: (auditResult: ReturnType<typeof AccessibilityTester.auditForm>) => {
    const { overall, details } = auditResult;
    
    const report = {
      summary: {
        score: overall.score,
        grade: overall.score >= 90 ? 'A' : overall.score >= 80 ? 'B' : overall.score >= 70 ? 'C' : 'F',
        passed: overall.passed,
        totalErrors: overall.errors.length,
        totalWarnings: overall.warnings.length,
      },
      sections: {
        colorContrast: {
          score: details.colorContrast.score,
          status: details.colorContrast.passed ? 'PASS' : 'FAIL',
          issues: [...details.colorContrast.errors, ...details.colorContrast.warnings],
        },
        formValidation: {
          score: details.formValidation.score,
          status: details.formValidation.passed ? 'PASS' : 'FAIL',
          issues: [...details.formValidation.errors, ...details.formValidation.warnings],
        },
        keyboardNavigation: {
          score: details.keyboardNavigation.score,
          status: details.keyboardNavigation.passed ? 'PASS' : 'FAIL',
          issues: [...details.keyboardNavigation.errors, ...details.keyboardNavigation.warnings],
        },
        rtlSupport: {
          score: details.rtlSupport.score,
          status: details.rtlSupport.passed ? 'PASS' : 'FAIL',
          issues: [...details.rtlSupport.errors, ...details.rtlSupport.warnings],
        },
        elements: details.elements.map((element, index) => ({
          elementIndex: index,
          score: element.score,
          status: element.passed ? 'PASS' : 'FAIL',
          issues: [...element.errors, ...element.warnings],
        })),
      },
      recommendations: [
        ...(overall.score < 90 ? ['Consider improving color contrast ratios'] : []),
        ...(details.keyboardNavigation.warnings.length > 0 ? ['Review keyboard navigation patterns'] : []),
        ...(details.rtlSupport.warnings.length > 0 ? ['Enhance RTL language support'] : []),
        ...(details.formValidation.errors.length > 0 ? ['Fix form validation accessibility issues'] : []),
      ],
    };

    return report;
  },
};

export default AccessibilityTester;
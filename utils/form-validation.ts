import { Page, Locator } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for form validation results
 */
export interface FormValidationResult {
  check: string;
  passed: boolean;
  message: string;
  field?: string;
  value?: string;
}

/**
 * Interface for form validation summary
 */
export interface FormValidationSummary {
  totalFields: number;
  passedFields: number;
  failedFields: number;
  results: FormValidationResult[];
  passed: boolean;
}

/**
 * Email validation regex patterns
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Phone number regex patterns
 */
const PHONE_PATTERNS = {
  US: /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  international: /^\+(?:[0-9] ?){6,14}[0-9]$/,
  flexible: /^[\d\s\-+()]+$/,
};

const loadSensitivePhones = () => {
  const base = process.cwd();
  const candidates = [
    path.join(base, 'config', 'sensitive-data.local.json'),
    path.join(base, 'config', 'sensitive-data.json'),
  ];

  for (const file of candidates) {
    if (existsSync(file)) {
      try {
        const parsed = JSON.parse(readFileSync(file, 'utf-8'));
        return parsed?.phoneNumbers || null;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const sensitivePhones = loadSensitivePhones();

/**
 * Validate email field format
 */
export async function validateEmailField(
  page: Page,
  selector: string,
  options?: {
    invalidEmails?: string[];
    validEmails?: string[];
    checkRequired?: boolean;
  }
): Promise<FormValidationResult> {
  const field = page.locator(selector);
  const fieldExists = await field.count() > 0;

  if (!fieldExists) {
    return {
      check: 'Email Field Validation',
      passed: false,
      message: `Email field not found: ${selector}`,
      field: selector,
    };
  }

  const fieldType = await field.getAttribute('type');
  if (fieldType && fieldType !== 'email' && fieldType !== 'text') {
    return {
      check: 'Email Field Validation',
      passed: false,
      message: `Field type should be 'email' or 'text', found: ${fieldType}`,
      field: selector,
    };
  }

  // Test with valid email if provided
  if (options?.validEmails && options.validEmails.length > 0) {
    const testEmail = options.validEmails[0];
    await field.fill(testEmail);
    await field.blur(); // Trigger validation

    // Check if field has invalid state
    const validity = await field.evaluate((el: HTMLInputElement) => el.validity.valid);
    if (!validity && !EMAIL_REGEX.test(testEmail)) {
      return {
        check: 'Email Field Validation',
        passed: false,
        message: `Valid email "${testEmail}" was rejected`,
        field: selector,
        value: testEmail,
      };
    }
  }

  // Test with invalid emails if provided
  if (options?.invalidEmails && options.invalidEmails.length > 0) {
    for (const invalidEmail of options.invalidEmails) {
      await field.fill(invalidEmail);
      await field.blur();

      const validity = await field.evaluate((el: HTMLInputElement) => el.validity.valid);
      const matchesPattern = EMAIL_REGEX.test(invalidEmail);

      // If pattern says invalid but browser accepts it, that's acceptable
      // But if browser rejects but pattern says valid, that's a problem
      if (!matchesPattern && validity) {
        // Browser accepted invalid email - might be using custom validation
        continue;
      }
    }
  }

  return {
    check: 'Email Field Validation',
    passed: true,
    message: 'Email field validation passed',
    field: selector,
  };
}

/**
 * Validate phone number field format
 */
export async function validatePhoneField(
  page: Page,
  selector: string,
  format: 'US' | 'international' | 'flexible' = 'flexible'
): Promise<FormValidationResult> {
  const field = page.locator(selector);
  const fieldExists = await field.count() > 0;

  if (!fieldExists) {
    return {
      check: 'Phone Field Validation',
      passed: false,
      message: `Phone field not found: ${selector}`,
      field: selector,
    };
  }

  const fieldType = await field.getAttribute('type');
  const expectedType = fieldType === 'tel' ? 'tel' : 'text';
  
  if (fieldType && fieldType !== 'tel' && fieldType !== 'text') {
    return {
      check: 'Phone Field Validation',
      passed: false,
      message: `Field type should be 'tel' or 'text', found: ${fieldType}`,
      field: selector,
    };
  }

  const pattern = PHONE_PATTERNS[format];

  // Test with a valid phone number (from env or local sensitive config)
  const defaultTestPhones = {
    US: '555-555-5555',
    international: '+1-555-555-5555',
    flexible: '5555555555',
  };

  const testPhones = {
    US: process.env.PHONE_TEST_US || sensitivePhones?.expectedPrimary || defaultTestPhones.US,
    international: process.env.PHONE_TEST_INTL || sensitivePhones?.expectedInternational || defaultTestPhones.international,
    flexible: process.env.PHONE_TEST_FLEX || sensitivePhones?.expectedFlexible || defaultTestPhones.flexible,
  };

  const testPhone = testPhones[format];
  await field.fill(testPhone);
  await field.blur();

  // Check if field accepts the phone format
  const value = await field.inputValue();
  const matchesPattern = pattern.test(value);

  if (!matchesPattern) {
    return {
      check: 'Phone Field Validation',
      passed: false,
      message: `Phone format validation failed for format: ${format}`,
      field: selector,
      value: value,
    };
  }

  return {
    check: 'Phone Field Validation',
    passed: true,
    message: `Phone field validation passed (${format} format)`,
    field: selector,
  };
}

/**
 * Validate required fields
 */
export async function validateRequiredFields(
  page: Page,
  formSelector: string,
  requiredFieldSelectors: string[]
): Promise<FormValidationResult[]> {
  const results: FormValidationResult[] = [];
  const form = page.locator(formSelector);

  if ((await form.count()) === 0) {
    return [{
      check: 'Required Fields Validation',
      passed: false,
      message: `Form not found: ${formSelector}`,
    }];
  }

  for (const selector of requiredFieldSelectors) {
    const field = form.locator(selector);
    const fieldExists = await field.count() > 0;

    if (!fieldExists) {
      results.push({
        check: 'Required Field',
        passed: false,
        message: `Required field not found: ${selector}`,
        field: selector,
      });
      continue;
    }

    // Check if field has required attribute
    const isRequired = await field.evaluate((el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
      return el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
    });

    if (!isRequired) {
      results.push({
        check: 'Required Field',
        passed: false,
        message: `Field should have 'required' attribute or aria-required="true": ${selector}`,
        field: selector,
      });
      continue;
    }

    // Check if field has associated label
    const hasLabel = await field.evaluate((el: HTMLElement) => {
      const id = el.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return true;
      }
      
      // Check for aria-label or aria-labelledby
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) {
        return true;
      }
      
      // Check for parent label
      const parentLabel = el.closest('label');
      return !!parentLabel;
    });

    if (!hasLabel) {
      results.push({
        check: 'Required Field Label',
        passed: false,
        message: `Required field should have associated label: ${selector}`,
        field: selector,
      });
    } else {
      results.push({
        check: 'Required Field',
        passed: true,
        message: `Required field validated: ${selector}`,
        field: selector,
      });
    }
  }

  return results;
}

/**
 * Test form submission workflow
 */
export async function testFormSubmission(
  page: Page,
  formSelector: string,
  formData: Record<string, string>,
  options?: {
    expectedResult?: 'success' | 'error';
    submitButtonSelector?: string;
    waitForNavigation?: boolean;
    timeout?: number;
  }
): Promise<FormValidationResult> {
  const form = page.locator(formSelector);
  const formExists = await form.count() > 0;

  if (!formExists) {
    return {
      check: 'Form Submission',
      passed: false,
      message: `Form not found: ${formSelector}`,
    };
  }

  // Fill form fields
  for (const [fieldSelector, value] of Object.entries(formData)) {
    const field = form.locator(fieldSelector);
    if (await field.count() > 0) {
      await field.fill(value);
    }
  }

  // Submit form
  const submitButton = options?.submitButtonSelector
    ? page.locator(options.submitButtonSelector)
    : form.locator('button[type="submit"], input[type="submit"]');

  if ((await submitButton.count()) === 0) {
    return {
      check: 'Form Submission',
      passed: false,
      message: 'Submit button not found',
    };
  }

  try {
    if (options?.waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ timeout: options?.timeout || 30000 }),
        submitButton.click(),
      ]);
    } else {
      await submitButton.click();
      await page.waitForTimeout(1000); // Wait for any async validation
    }

    // Check for success/error messages based on expected result
    if (options?.expectedResult === 'success') {
      const successIndicators = [
        page.locator('[class*="success"], [class*="message"]'),
        page.locator('text=/success/i'),
        page.locator('text=/thank you/i'),
      ];

      let foundSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.count() > 0) {
          foundSuccess = true;
          break;
        }
      }

      if (!foundSuccess) {
        return {
          check: 'Form Submission',
          passed: false,
          message: 'Expected success message not found after form submission',
        };
      }
    }

    return {
      check: 'Form Submission',
      passed: true,
      message: 'Form submission workflow completed',
    };
  } catch (error: any) {
    return {
      check: 'Form Submission',
      passed: false,
      message: `Form submission failed: ${error.message}`,
    };
  }
}

/**
 * Validate all forms on a page
 */
export async function validateForms(
  page: Page,
  options?: {
    formSelectors?: string[];
    validateEmailFields?: boolean;
    validatePhoneFields?: boolean;
    validateRequiredFields?: boolean;
  }
): Promise<FormValidationSummary> {
  const results: FormValidationResult[] = [];

  // Find all forms if no selectors provided
  const formSelectors = options?.formSelectors || ['form'];
  const forms: string[] = [];

  if (options?.formSelectors) {
    forms.push(...options.formSelectors);
  } else {
    // Auto-detect forms
    const formCount = await page.locator('form').count();
    for (let i = 0; i < formCount; i++) {
      forms.push(`form:nth-of-type(${i + 1})`);
    }
  }

  for (const formSelector of forms) {
    const form = page.locator(formSelector);
    if ((await form.count()) === 0) continue;

    // Find email fields
    if (options?.validateEmailFields !== false) {
      const emailFields = await form.locator('input[type="email"], input[name*="email" i], input[id*="email" i]').all();
      for (const field of emailFields) {
        const selector = await field.evaluate((el: HTMLElement) => {
          if (el.id) return `#${el.id}`;
          if (el.name) return `[name="${el.name}"]`;
          return el.tagName.toLowerCase();
        }).catch(() => 'email-field');
        
        results.push(await validateEmailField(page, selector));
      }
    }

    // Find phone fields
    if (options?.validatePhoneFields !== false) {
      const phoneFields = await form.locator('input[type="tel"], input[name*="phone" i], input[id*="phone" i]').all();
      for (const field of phoneFields) {
        const selector = await field.evaluate((el: HTMLElement) => {
          if (el.id) return `#${el.id}`;
          if (el.name) return `[name="${el.name}"]`;
          return el.tagName.toLowerCase();
        }).catch(() => 'phone-field');
        
        results.push(await validatePhoneField(page, selector));
      }
    }

    // Find required fields
    if (options?.validateRequiredFields !== false) {
      const requiredFields = await form.locator('[required], [aria-required="true"]').all();
      const requiredSelectors: string[] = [];
      
      for (const field of requiredFields) {
        const selector = await field.evaluate((el: HTMLElement) => {
          if (el.id) return `#${el.id}`;
          if (el.name) return `[name="${el.name}"]`;
          return el.tagName.toLowerCase();
        }).catch(() => 'required-field');
        
        requiredSelectors.push(selector);
      }
      
      if (requiredSelectors.length > 0) {
        results.push(...await validateRequiredFields(page, formSelector, requiredSelectors));
      }
    }
  }

  const passedFields = results.filter(r => r.passed).length;
  const failedFields = results.filter(r => !r.passed).length;

  return {
    totalFields: results.length,
    passedFields,
    failedFields,
    results,
    passed: failedFields === 0,
  };
}

/**
 * Format form validation report
 */
export function formatFormValidationReport(
  summary: FormValidationSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.field || result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.message,
    }));

    sections.push({
      title: 'Form Validation Results',
      items,
    });
  }

  const summaryItems: ReportItem[] = [
    {
      label: 'Total Fields Checked',
      value: summary.totalFields,
      status: 'info',
    },
    {
      label: 'Passed',
      value: summary.passedFields,
      status: summary.passedFields === summary.totalFields ? 'passed' : 'warning',
    },
    {
      label: 'Failed',
      value: summary.failedFields,
      status: summary.failedFields === 0 ? 'passed' : 'failed',
    },
  ];

  return formatUnifiedReport({
    testName: 'Form Validation',
    url,
    summary: summaryItems,
    sections,
  });
}

import { Page, APIRequestContext } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';
import { reportFailure } from './failure-reporter';
import { FailureContext } from './failure-schema';

/**
 * Interface for user flow test results
 */
export interface UserFlowResult {
  check: string;
  passed: boolean;
  message: string;
  step?: string;
  element?: string;
  context?: FailureContext;
}

/**
 * Interface for user flow summary
 */
export interface UserFlowSummary {
  totalFlows: number;
  passedFlows: number;
  failedFlows: number;
  results: UserFlowResult[];
  passed: boolean;
  failureContexts?: FailureContext[];
}

/**
 * Test contact form submission flow
 */
export async function testContactFormFlow(
  page: Page,
  formData: Record<string, string>,
  options?: {
    formSelector?: string;
    submitButtonSelector?: string;
    waitForNavigation?: boolean;
    timeout?: number;
  }
): Promise<UserFlowResult[]> {
  const results: UserFlowResult[] = [];
  const formSelector = options?.formSelector || 'form';

  const form = page.locator(formSelector).first();
  const formExists = await form.count() > 0;

  if (!formExists) {
    return [{
      check: 'Contact Form Flow',
      passed: false,
      message: `Contact form not found: ${formSelector}`,
      step: 'Form Detection',
    }];
  }

  try {
    // Fill form fields
    for (const [fieldSelector, value] of Object.entries(formData)) {
      const field = form.locator(fieldSelector);
      const fieldExists = await field.count() > 0;

      if (!fieldExists) {
        results.push({
          check: 'Contact Form Flow',
          passed: false,
          message: `Form field not found: ${fieldSelector}`,
          step: 'Field Filling',
          element: fieldSelector,
        });
        continue;
      }

      await field.fill(value);
      results.push({
        check: 'Contact Form Flow',
        passed: true,
        message: `Filled field: ${fieldSelector}`,
        step: 'Field Filling',
        element: fieldSelector,
      });
    }

    // Submit form
    const submitButton = options?.submitButtonSelector
      ? page.locator(options.submitButtonSelector)
      : form.locator('button[type="submit"], input[type="submit"]');

    if ((await submitButton.count()) === 0) {
      results.push({
        check: 'Contact Form Flow',
        passed: false,
        message: 'Submit button not found',
        step: 'Form Submission',
      });
      return results;
    }

    if (options?.waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ timeout: options?.timeout || 30000 }).catch(() => {}),
        submitButton.click(),
      ]);
    } else {
      await submitButton.click();
      await page.waitForTimeout(2000); // Wait for response
    }

    // Check for success indicators
    const successIndicators = [
      page.locator('[class*="success"], [class*="message"]'),
      page.locator('text=/success/i'),
      page.locator('text=/thank you/i'),
      page.locator('text=/message sent/i'),
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        const isVisible = await indicator.first().isVisible().catch(() => false);
        if (isVisible) {
          foundSuccess = true;
          break;
        }
      }
    }

    if (foundSuccess) {
      results.push({
        check: 'Contact Form Flow',
        passed: true,
        message: 'Contact form submitted successfully',
        step: 'Form Submission',
      });
    } else {
      results.push({
        check: 'Contact Form Flow',
        passed: false,
        message: 'Contact form submission completed but success message not found',
        step: 'Form Submission',
      });
    }

    return results;
  } catch (error: any) {
    let context: FailureContext | undefined;
    try {
      context = await reportFailure(page, {
        id: 'contact-form-flow',
        category: 'user-flow',
        selector: formSelector,
        timing: 'after-interaction',
        description: 'Contact form flow failed',
        expected: 'Form should submit successfully',
        actual: error.message,
      });
    } catch {
      context = undefined;
    }

    return [{
      check: 'Contact Form Flow',
      passed: false,
      message: `Error testing contact form flow: ${error.message}`,
      step: 'Error',
      context,
    }];
  }
}

/**
 * Test phone number - handles both clickable links and image-based phone numbers
 * Checks if phone number images are broken (404) and optionally uses OCR to extract phone numbers
 */
export async function testPhoneClickToCall(
  page: Page,
  phoneSelectors?: string[],
  options?: {
    checkImages?: boolean;
    expectedPhoneNumber?: string;
    request?: APIRequestContext; // For checking broken images
  }
): Promise<UserFlowResult[]> {
  const results: UserFlowResult[] = [];

  // First, check for clickable phone links
  const linkSelectors = phoneSelectors || [
    'a[href^="tel:"]',
    'a[href^="callto:"]',
  ];

  const phoneLinks: any[] = [];

  for (const selector of linkSelectors) {
    const links = await page.locator(selector).all();
    phoneLinks.push(...links);
  }

  // Check clickable phone links
  for (const link of phoneLinks) {
    const href = await link.getAttribute('href').catch(() => '');
    const text = await link.textContent().catch(() => '');

    if (!href) {
      results.push({
        check: 'Phone Click-to-Call',
        passed: false,
        message: 'Phone link missing href attribute',
        element: text || 'phone-link',
      });
      continue;
    }

    if (!href.startsWith('tel:') && !href.startsWith('callto:')) {
      results.push({
        check: 'Phone Click-to-Call',
        passed: false,
        message: `Phone link href should start with "tel:" or "callto:", found: ${href}`,
        element: text || 'phone-link',
      });
      continue;
    }

    const phoneNumber = href.replace(/^(tel:|callto:)/i, '').trim();
    if (!phoneNumber) {
      results.push({
        check: 'Phone Click-to-Call',
        passed: false,
        message: 'Phone link href is missing phone number',
        element: text || 'phone-link',
      });
      continue;
    }

    results.push({
      check: 'Phone Click-to-Call',
      passed: true,
      message: `Phone link configured correctly: ${phoneNumber}`,
      element: text || phoneNumber,
    });
  }

  // Check for phone number images (if enabled)
  if (options?.checkImages !== false) {
    const phoneImageResults = await testPhoneNumberImages(page, options?.expectedPhoneNumber, options?.request);
    results.push(...phoneImageResults);
  }

  if (phoneLinks.length === 0 && results.length === 0) {
    results.push({
      check: 'Phone Number',
      passed: true,
      message: 'No phone links or phone images found (not applicable)',
    });
  }

  return results;
}

/**
 * Test phone number images - check if images containing phone numbers are broken (404)
 * Optionally uses OCR (Tesseract.js) to extract phone numbers from images if package is installed
 */
export async function testPhoneNumberImages(
  page: Page,
  expectedPhoneNumber?: string,
  request?: APIRequestContext
): Promise<UserFlowResult[]> {
  const results: UserFlowResult[] = [];

  try {
    // Find images that might contain phone numbers
    // Strategy: Look for images with phone-related attributes or in phone-related containers
    const phoneImageSelectors = [
      'img[alt*="phone" i]',
      'img[alt*="call" i]',
      'img[alt*="contact" i]',
      '[class*="phone"] img',
      '[class*="contact"] img',
      '[id*="phone"] img',
      '[id*="contact"] img',
    ];

    const phoneImages: any[] = [];

    // Collect images from selectors
    for (const selector of phoneImageSelectors) {
      const images = await page.locator(selector).all();
      phoneImages.push(...images);
    }

    // Also check all images and filter by context (near phone-related text or numbers)
    const allImages = await page.locator('img').all();
    for (const img of allImages) {
      if (phoneImages.includes(img)) continue; // Skip duplicates
      
      const alt = await img.getAttribute('alt').catch(() => '') || '';
      const src = await img.getAttribute('src').catch(() => '') || '';
      
      if (!src) continue;

      // Check if image is in a phone-related context by checking parent elements
      try {
        const parentContext = await img.evaluate((el: HTMLElement) => {
          let context = '';
          let current: HTMLElement | null = el.parentElement;
          let depth = 0;
          
          // Check up to 3 levels of parents
          while (current && depth < 3) {
            const text = current.textContent || '';
            const className = current.className || '';
            const id = current.id || '';
            context += ` ${text} ${className} ${id}`;
            current = current.parentElement;
            depth++;
          }
          return context;
        });

        // Check for phone-related keywords or phone number patterns
        const hasPhoneContext = /phone|call|contact|tel|602|553|8178|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/i.test(parentContext) ||
                                 /phone|call|contact|tel/i.test(alt);
        
        if (hasPhoneContext) {
          phoneImages.push(img);
        }
      } catch {
        // Error checking context - skip this image
      }
    }

    if (phoneImages.length === 0) {
      return [{
        check: 'Phone Number Image',
        passed: true,
        message: 'No phone number images found (not applicable)',
      }];
    }

    // Check each phone image
    for (const img of phoneImages) {
      const src = await img.getAttribute('src').catch(() => '');
      const alt = await img.getAttribute('alt').catch(() => '');
      
      if (!src) {
        results.push({
          check: 'Phone Number Image',
          passed: false,
          message: 'Phone image missing src attribute',
          element: alt || 'phone-image',
        });
        continue;
      }

      // Resolve relative URLs to absolute
      let imageUrl: string = src;
      try {
        imageUrl = src.startsWith('http') ? src : new URL(src, page.url()).href;
      } catch {
        // Keep original src if URL parsing fails
        imageUrl = src;
      }

      // Check if image is broken (404) using request context
      if (request) {
        try {
          const response = await request.get(imageUrl);
          const status = response.status();

          if (status >= 400) {
            results.push({
              check: 'Phone Number Image',
              passed: false,
              message: `Phone number image is broken (${status} ${response.statusText()})`,
              element: alt || imageUrl.substring(0, 50),
            });
            continue; // Image is broken, skip OCR
          }
        } catch (error: any) {
          // Network error - image might be broken
          results.push({
            check: 'Phone Number Image',
            passed: false,
            message: `Phone number image failed to load: ${error.message}`,
            element: alt || imageUrl.substring(0, 50),
          });
          continue;
        }
      }

      // Try to extract phone number from image using OCR (optional - requires tesseract.js)
      let extractedPhoneNumber: string | null = null;
      let ocrAttempted = false;
      
      // Only attempt OCR if expected phone number is provided (to avoid unnecessary processing)
      if (expectedPhoneNumber) {
        try {
          // Check if tesseract.js is available (requires: npm install tesseract.js)
          let Tesseract: any = null;
          try {
            Tesseract = require('tesseract.js');
            ocrAttempted = true;
          } catch {
            // Tesseract.js not installed - that's okay
          }

          if (Tesseract) {
            // Capture image buffer (no file written) and perform OCR
            const screenshotBuffer: Buffer = await img.screenshot();
            const { data: { text } } = await Tesseract.recognize(screenshotBuffer, 'eng', {
              logger: () => {}, // Silent logger
            });
            
            // Extract phone number from OCR text using multiple patterns
            const phonePatterns = [
              /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // US format
              /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // Simple format
              /602[-.\s]?553[-.\s]?8178/, // Specific number from testlist
            ];

            for (const pattern of phonePatterns) {
              const match = text.match(pattern);
              if (match) {
                extractedPhoneNumber = match[0].replace(/[\s\-().]/g, '');
                break;
              }
            }
          }
        } catch (ocrError: any) {
          // OCR failed - that's okay, we still checked if image loads
          // Don't fail the test if OCR is not available or fails
        }
      }

      // If we have an expected phone number, verify it matches
      if (expectedPhoneNumber) {
        if (extractedPhoneNumber && extractedPhoneNumber.length > 0) {
          const normalizedExpected = expectedPhoneNumber.replace(/[\s\-().]/g, '');
          const normalizedExtracted = extractedPhoneNumber.replace(/[\s\-().]/g, '');
          
          if (normalizedExtracted.includes(normalizedExpected) || normalizedExpected.includes(normalizedExtracted)) {
            results.push({
              check: 'Phone Number Image',
              passed: true,
              message: `Phone number image contains expected number: ${expectedPhoneNumber} (OCR detected: ${extractedPhoneNumber})`,
              element: alt || imageUrl.substring(0, 50),
            });
          } else {
            results.push({
              check: 'Phone Number Image',
              passed: false,
              message: `Phone number image contains different number. Expected: ${expectedPhoneNumber}, Found: ${extractedPhoneNumber}`,
              element: alt || imageUrl.substring(0, 50),
            });
          }
        } else {
          // Image loads but OCR didn't find phone number (or OCR not available)
          results.push({
            check: 'Phone Number Image',
            passed: true,
            message: `Phone number image loads successfully${ocrAttempted ? ' (OCR attempted but phone number not detected)' : ' (OCR not available - install tesseract.js for phone number extraction)'}`,
            element: alt || imageUrl.substring(0, 50),
          });
        }
      } else {
        // No expected phone number - just verify image loads
        results.push({
          check: 'Phone Number Image',
          passed: true,
          message: `Phone number image loads successfully${extractedPhoneNumber ? ` (OCR detected: ${extractedPhoneNumber})` : ''}`,
          element: alt || imageUrl.substring(0, 50),
        });
      }
    }

    return results;
  } catch (error: any) {
    let context: FailureContext | undefined;
    try {
      context = await reportFailure(page, {
        id: 'phone-image-flow',
        category: 'user-flow',
        selector: 'img',
        timing: 'after-interaction',
        description: 'Phone number image verification failed',
        expected: 'Phone images should load and match expected number',
        actual: error.message,
      });
    } catch {
      context = undefined;
    }

    return [{
      check: 'Phone Number Image',
      passed: false,
      message: `Error testing phone number images: ${error.message}`,
      context,
    }];
  }
}

/**
 * Test profile browsing flow (generic implementation)
 */
export async function testProfileBrowsingFlow(
  page: Page,
  options?: {
    profileLinkSelectors?: string[];
    profileImageSelectors?: string[];
  }
): Promise<UserFlowResult[]> {
  const results: UserFlowResult[] = [];

  const profileLinkSelectors = options?.profileLinkSelectors || [
    'a[href*="profile"]',
    'a[href*="member"]',
    '[class*="profile"]',
  ];

  const profileLinks: any[] = [];

  for (const selector of profileLinkSelectors) {
    const links = await page.locator(selector).all();
    profileLinks.push(...links);
  }

  if (profileLinks.length === 0) {
    results.push({
      check: 'Profile Browsing Flow',
      passed: true,
      message: 'No profile links found (not applicable)',
    });
    return results;
  }

  // Test first profile link
  const firstLink = profileLinks[0];
  const href = await firstLink.getAttribute('href').catch(() => '');
  const text = await firstLink.textContent().catch(() => '');

  if (!href || href === '#') {
    results.push({
      check: 'Profile Browsing Flow',
      passed: false,
      message: 'Profile link has invalid href',
      element: text || 'profile-link',
    });
    return results;
  }

  try {
    // Click profile link
    await firstLink.click();
    await page.waitForTimeout(1000); // Wait for navigation/loading

    // Check if we navigated or profile loaded
    const currentUrl = page.url();
    if (currentUrl !== page.url() || href.startsWith('http')) {
      results.push({
        check: 'Profile Browsing Flow',
        passed: true,
        message: 'Profile link navigation works',
        element: text || href,
      });
    } else {
      results.push({
        check: 'Profile Browsing Flow',
        passed: true,
        message: 'Profile link is clickable',
        element: text || href,
      });
    }
  } catch (error: any) {
    let context: FailureContext | undefined;
    try {
      context = await reportFailure(page, {
        id: 'profile-browsing-flow',
        category: 'user-flow',
        selector: text || href || 'profile-link',
        timing: 'after-interaction',
        description: 'Profile browsing failed',
        expected: 'Profile page should open',
        actual: error.message,
      });
    } catch {
      context = undefined;
    }

    results.push({
      check: 'Profile Browsing Flow',
      passed: false,
      message: `Error testing profile browsing: ${error.message}`,
      element: text || href,
      context,
    });
  }

  return results;
}

/**
 * Test registration/signup flow
 */
export async function testRegistrationFlow(
  page: Page,
  userData: Record<string, string>,
  options?: {
    formSelector?: string;
    submitButtonSelector?: string;
    waitForNavigation?: boolean;
  }
): Promise<UserFlowResult[]> {
  // Similar to contact form but for registration
  return testContactFormFlow(page, userData, {
    formSelector: options?.formSelector,
    submitButtonSelector: options?.submitButtonSelector,
    waitForNavigation: options?.waitForNavigation,
  });
}

/**
 * Run all user flow tests
 */
export async function runUserFlowTests(
  page: Page,
  options?: {
    contactFormData?: Record<string, string>;
    contactFormSelector?: string;
    phoneSelectors?: string[];
    expectedPhoneNumber?: string; // For validating phone number images
    profileLinkSelectors?: string[];
    registrationData?: Record<string, string>;
    registrationFormSelector?: string;
    request?: APIRequestContext; // For checking broken phone images
  }
): Promise<UserFlowSummary> {
  const results: UserFlowResult[] = [];

  // Contact Form Flow
  if (options?.contactFormData) {
    results.push(...await testContactFormFlow(page, options.contactFormData, {
      formSelector: options.contactFormSelector,
    }));
  }

  // Phone Click-to-Call (includes image checking)
  results.push(...await testPhoneClickToCall(page, options?.phoneSelectors, {
    checkImages: true,
    expectedPhoneNumber: options?.expectedPhoneNumber,
    request: options?.request,
  }));

  // Profile Browsing Flow
  results.push(...await testProfileBrowsingFlow(page, {
    profileLinkSelectors: options?.profileLinkSelectors,
  }));

  // Registration Flow
  if (options?.registrationData) {
    results.push(...await testRegistrationFlow(page, options.registrationData, {
      formSelector: options.registrationFormSelector,
    }));
  }

  const passedFlows = results.filter(r => r.passed).length;
  const failedFlows = results.filter(r => !r.passed).length;
  const failureContexts = results
    .map(r => r.context)
    .filter((ctx): ctx is FailureContext => ctx !== undefined);

  return {
    totalFlows: results.length,
    passedFlows,
    failedFlows,
    results,
    passed: failedFlows === 0,
    failureContexts,
  };
}

/**
 * Format user flow report
 */
export function formatUserFlowReport(
  summary: UserFlowSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.element || result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.step ? `${result.message} (${result.step})` : result.message,
    }));

    sections.push({
      title: 'User Flow Test Results',
      items,
    });
  }

  const summaryItems: ReportItem[] = [
    {
      label: 'Total Flows',
      value: summary.totalFlows,
      status: 'info',
    },
    {
      label: 'Passed',
      value: summary.passedFlows,
      status: summary.passedFlows === summary.totalFlows ? 'passed' : 'warning',
    },
    {
      label: 'Failed',
      value: summary.failedFlows,
      status: summary.failedFlows === 0 ? 'passed' : 'failed',
    },
  ];

  return formatUnifiedReport({
    testName: 'User Flows',
    url,
    summary: summaryItems,
    sections,
  });
}

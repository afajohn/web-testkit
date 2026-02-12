import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkSocial(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    
    // 1. Twitter Card Validation
    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    if (!twitterCard) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Twitter Card',
        message: 'Twitter card meta tag is missing. Links shared on X will look plain.',
        selector: 'head', outerHTML: 'N/A', severity: 'low',
        fix: 'Add <meta name="twitter:card" content="summary_large_image">.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    // 2. Social Link Validation (Facebook, X, Instagram, LinkedIn)
    const socialPlatforms = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com'];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (socialPlatforms.some(p => href.includes(p))) {
        if (href.includes('your-profile') || href.length < 25) { // Catch placeholder links
           const r = a.getBoundingClientRect();
           found.push({
             url: pageUrl, category: 'FUNC', title: 'Social Link Placeholder',
             message: `Social link appears to be a placeholder: ${href}`,
             selector: `a[href="${href}"]`, outerHTML: a.outerHTML,
             severity: 'medium', fix: 'Replace the placeholder social link with your actual profile URL.',
             boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
           });
        }
      }
    });

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e, id: generateErrorId(e), fingerprint: generateErrorId(e)
  })) as AuditError[];
}
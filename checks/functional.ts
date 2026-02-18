import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkFunctional(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    const currentDomain = new URL(pageUrl).hostname;

    // 🎯 HELPER: Robust Selector
    const getSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        if (tag === 'a' && el.getAttribute('href')) return `a[href="${el.getAttribute('href')}"]`;
        if (el.getAttribute('name')) return `${tag}[name="${el.getAttribute('name')}"]`;
        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. Audit CTA Buttons (Human Finger Logic)
    document.querySelectorAll('button, a.btn, .button, [role="button"]').forEach(btn => {
      const el = btn as HTMLElement;
      const r = el.getBoundingClientRect();
      const text = el.textContent?.trim() || el.getAttribute('aria-label');
      const selector = getSelector(el);
      
      if (r.width > 0 && r.height > 0) {
        const area = r.width * r.height;
        // If it's too small for a human thumb, it's a UX failure.
        const isTooNarrow = r.width < 44;
        const isTooShort = r.height < 24;
        const isTinySquare = r.width < 32 && r.height < 32;

        if (isTinySquare || (isTooNarrow && isTooShort)) {
            found.push({
                url: pageUrl, category: 'FUNC', title: 'Tiny Click Target',
                message: `Target "${text?.substring(0, 15)}" is too small for mobile thumbs.`,
                selector: selector, outerHTML: el.outerHTML.substring(0, 150),
                severity: 'medium', fix: 'Increase size or padding to at least 44x44px.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, 
                detectedAt: Date.now()
            });
        }

        if (!text) {
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Empty Button',
            message: 'Button has no accessible text or label.',
            selector: selector, outerHTML: el.outerHTML.substring(0, 150),
            severity: 'high', fix: 'Add descriptive text or an aria-label.',
            boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, 
            detectedAt: Date.now()
          });
        }
      }
    });

    // 2. INTELLIGENT LINK SECURITY
    document.querySelectorAll('a').forEach(link => {
      const el = link as HTMLElement;
      const href = el.getAttribute('href') || '';
      const target = (el.getAttribute('target') || '').toLowerCase();
      const rel = (el.getAttribute('rel') || '').toLowerCase();
      const r = el.getBoundingClientRect();

      //Dead Anchor Check
      //If theres no href, this is a placeholder that does nothing.
      if(href === null || href === ""){
        const err: Partial<AuditError> = {
          url: pageUrl, category: 'FUNC', title: 'Dead Anchor Tag',
          message: `Anchor <a> tag is missing an href attribute. It is a dead element.`,
          selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 150),
          severity: 'medium', fix: 'Add a valud href or convert this to a <button> or <span>.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
          detectedAt: Date.now()
        }
        found.push({ ...err, id: generateErrorId(err), fingerprint: generateErrorId(err) } as AuditError);
        return;
      }

      // Skip non-navigational links
      if (!href || href.startsWith('javascript') || href.startsWith('#')) return;

      // Check if link is external or internal
      let isExternal = false;
      try {
        const linkHost = new URL(href, pageUrl).hostname;
        isExternal = linkHost !== currentDomain;
      } catch (e) { return; }

      // Link opens a new tab
      if (target === '_blank') {

        // For External Logic
        if (isExternal) {
        //Both has noopener and noreferrer
        // noreffer stops them from seeing where we are sending them, noopener stops them from being able to manipulate our page via window.opener
          if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
            found.push({
              url: pageUrl, category: 'SECURITY', title: 'Unsafe External Link',
              message: `External link missing 'noopener noreferrer'.`,
              selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 150),
              severity: 'medium', fix: 'Add rel="noopener noreferrer" for security.',
              boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
              detectedAt: Date.now()
            });
          }
        } 
        
        //For Internal Logic
        else {

          //Performance: noopener makes the new tab run on separate CPU thread (faster).
          if (!rel.includes('noopener')) {
            found.push({
              url: pageUrl, category: 'FUNC', title: 'Performance Risk (Internal)',
              message: `Internal _blank link missing 'noopener'.`,
              selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 150),
              severity: 'low', fix: 'Add rel="noopener" to improve browser performance.',
              boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
              detectedAt: Date.now()
            });
          }

          //Analytics Protection: Internal links should NOT hide referrer data.
          //If they have noreferrer, Google Analytics won't know the user came from our homepage.
          if (rel.includes('noreferrer')){
            found.push({
              url: pageUrl, category: 'SEO', title: 'Analytics Blocker',
              message: `Internal link has 'noreferrer'. This kills tracking data.`,
              selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 150),
              severity: 'medium', fix: 'Remove "noreferrer" from internal links.',
              boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
              detectedAt: Date.now()
            });
          }
        }
      } 
      
      //Link opens in the same tab (standard link)
      else {

        //Even without _blank, internal link should NEVER have noreferrer.
        //It breaks the marketing data for no reason.
        if (!isExternal && rel.includes('noreferrer')){
          found.push({
             url: pageUrl, category: 'SEO', title: 'Analytics Blocker',
             message: `Same-tab internal link has 'noreferrer'.`,
             selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 150),
             severity: 'medium', fix: 'Remove "noreferrer" from internal links.',
             boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
             detectedAt: Date.now()
          });
        }
      }
    });

    // 3. Video Embeds
    document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]').forEach(video => {
      const el = video as HTMLIFrameElement;
      const src = el.getAttribute('src') || '';
      const r = el.getBoundingClientRect();
      const selector = getSelector(el);
      
      //Accessibility check: Screen readers need a title to explain the video.
      if (!el.hasAttribute('title')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Video Missing Title',
          message: 'Video iframe is missing a title attribute.',
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'medium', fix: 'Add a title="..." attribute.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
          detectedAt: Date.now()
        });
      }

      //Placeholder check: Developers often forget to change the video ID from the example code.
      if (src.includes('insert_video_id')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Broken Video Embed',
          message: `Video source is a placeholder.`,
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'critical', fix: 'Replace with a valid video ID.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
          detectedAt: Date.now()
        });
      }
    });

    return found;
  }, url);

  // Apply fingerprints and IDs
  return rawErrors.map(e => ({
    ...e, 
    id: generateErrorId(e), 
    fingerprint: generateErrorId(e)
  })) as AuditError[];
}
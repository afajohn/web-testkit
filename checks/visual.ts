import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkVisual(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 🎯 HELPER: Precision Selector
    const getVisualSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        if (tag === 'img') {
            const src = el.getAttribute('src');
            const matches = document.querySelectorAll(`img[src="${src}"]`);
            if (matches.length > 1) return `img[src="${src}"]:nth-of-type(${Array.from(matches).indexOf(el) + 1})`;
            return `img[src="${src}"]`;
        }
        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. Broken Images & Image Integrity (Distortion)
    document.querySelectorAll('img').forEach(img => {
      const el = img as HTMLImageElement;
      const r = el.getBoundingClientRect();
      
      // Skip invisible or tiny icons
      if (r.width < 5 || r.height < 5) return;

      // Check A: Render Failure (Natural Width 0)
      if (el.naturalWidth === 0 && el.src && !el.src.startsWith('data:')) {
        found.push({
          url: pageUrl, category: 'VISUAL', title: 'Image Render Failure',
          message: `Image failed to display pixels. Path: ${getVisualSelector(el)}`,
          selector: getVisualSelector(el), outerHTML: el.outerHTML.substring(0, 150),
          severity: 'high', fix: 'Verify image source path and file integrity.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      // Check B: Aspect Ratio Distortion (The "Funhouse Mirror" check)
      if (el.naturalWidth > 0 && el.naturalHeight > 0) {
          const renderedRatio = r.width / r.height;
          const naturalRatio = el.naturalWidth / el.naturalHeight;
          const delta = Math.abs(renderedRatio - naturalRatio);

          // If the ratio is off by more than 15%, it's visibly stretched/squashed
          if (delta > 0.15) {
            found.push({
                url: pageUrl, category: 'VISUAL', title: 'Image Distortion',
                message: `Image is stretched or squashed. (Rendered: ${renderedRatio.toFixed(2)}, Natural: ${naturalRatio.toFixed(2)})`,
                selector: getVisualSelector(el), outerHTML: el.outerHTML.substring(0, 150),
                severity: 'medium', fix: 'Use "object-fit: cover;" or "contain;" in CSS to preserve ratio.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
            });
          }
      }
    });

    // 2. Grid/Flex Alignment (Uneven Siblings)
    // We check siblings with the same class. If they are in a row but have different heights...
    const processedParents = new Set<Element>();
    document.querySelectorAll('.row, [class*="grid"], [class*="container"], [class*="list"]').forEach(parent => {
        if (processedParents.has(parent)) return;
        processedParents.add(parent);

        const children = Array.from(parent.children).filter(c => c.getBoundingClientRect().width > 50);
        if (children.length < 2) return;

        const firstRect = children[0].getBoundingClientRect();
        const unevenChild = children.find(c => Math.abs(c.getBoundingClientRect().height - firstRect.height) > 40);

        if (unevenChild) {
            const r = unevenChild.getBoundingClientRect();
            found.push({
                url: pageUrl, category: 'VISUAL', title: 'Layout Alignment Issue',
                message: 'Uneven element heights detected in a shared container. This creates an unpolished grid.',
                selector: getVisualSelector(parent as HTMLElement),
                outerHTML: parent.outerHTML.substring(0, 100),
                severity: 'low', fix: 'Use "display: flex; align-items: stretch;" on the parent container.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
            });
        }
    });

    // 3. Layout Structure (Header/Footer/Main)
    const structure = [
        { sel: 'header, .header, [role="banner"]', name: 'Header' },
        { sel: 'footer, .footer, [role="contentinfo"]', name: 'Footer' },
        { sel: 'main, [role="main"]', name: 'Main Content Area' }
    ];

    structure.forEach(s => {
        if (!document.querySelector(s.sel)) {
            found.push({
                url: pageUrl, category: 'SEO', title: `Missing ${s.name}`,
                message: `The page lacks a semantic <${s.name.toLowerCase()}> tag.`,
                selector: 'body', outerHTML: 'N/A', severity: 'medium',
                fix: `Wrap the ${s.name} in its proper HTML5 semantic tag.`,
                boundingBox: null, detectedAt: Date.now()
            });
        }
    });

    return found;
  }, url);

  return rawErrors.map(e => ({ ...e, id: generateErrorId(e), fingerprint: generateErrorId(e) })) as AuditError[];
}
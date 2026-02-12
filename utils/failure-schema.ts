export type FailureCategory =
  | 'a11y-dom'
  | 'user-flow'
  | 'functional'
  | 'layout'
  | 'mobile'
  | 'seo'
  | 'security'
  | 'performance'
  | 'content';

export interface FailureContext {
  id: string;
  category: FailureCategory;
  url: string;
  pagePath?: string;
  selector?: string;
  target?: string;
  timing: 'initial-render' | 'post-hydration' | 'after-interaction' | 'load';
  viewport: string;
  description: string;
  expected?: string;
  actual?: string;
  evidence: {
    screenshot?: string;
    domSnapshot?: string;
  };
  metadata?: Record<string, any>;
}

import { createHash } from 'crypto';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditError {
  id: string;              
  url: string;
  category: 'SEO' | 'A11Y' | 'SECURITY' | 'FUNC'; 
  title: string;           
  message: string;         
  selector: string;        
  outerHTML: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  severity: AuditSeverity;
  fingerprint: string;     
  detectedAt: number;
  fix: string;
  status?: 'NEW' | 'STILL_BROKEN' | 'FIXED';
}

export interface PageResult {
  domain: string;
  url: string;
  errors: AuditError[];
  timestamp: string;
}

export function generateErrorId(err: Partial<AuditError>): string {
  const data = `${err.url}|${err.category}|${err.title}|${err.selector}`;
  return createHash('md5').update(data).digest('hex');
}
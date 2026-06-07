export type PageNoticeTone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export interface PageNotice {
  tone: PageNoticeTone;
  message: string;
  title?: string;
}

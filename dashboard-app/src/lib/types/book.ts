/**
 * Book-related TypeScript types
 * @module types/book
 */

export type Subject = 'physics' | 'chemistry' | 'biology' | 'math' | 'geography' | 'arabic' | 'english' | 'history' | 'philosophy' | 'other';

export type Grade = '1st-prep' | '2nd-prep' | '3rd-prep' | '1st-secondary' | '2nd-secondary' | '3rd-secondary';

export type ExtractionStatus = 'pending' | 'extracting' | 'completed' | 'failed' | 'partial';

export type VideoStatus = 'not_generated' | 'generating' | 'generated' | 'failed' | 'cancelled';

export type LessonStatus = 'pending' | 'extracting' | 'extracted' | 'reviewed' | 'video_generating' | 'video_generated' | 'failed';

export interface BookMeta {
  id: string;
  title: string;
  subject: Subject;
  grade: Grade;
  publisher?: string;
  source_pdf: string;
  total_pages: number;
  cover_image?: string | null;
  created_at: string;
  updated_at: string;
  extraction_status: ExtractionStatus;
  extraction_progress: number; // 0-100
}

export interface LessonSummary {
  id: string;
  title: string;
  page_start: number;
  page_end: number;
  status: LessonStatus;
  lesson_file: string;
  video_status: VideoStatus;
}

export interface Unit {
  id: string;
  title: string;
  order: number;
  page_start: number;
  page_end: number;
  lessons: LessonSummary[];
}

export interface BookStats {
  total_units: number;
  total_lessons: number;
  extracted_lessons: number;
  videos_generated: number;
  videos_pending: number;
}

export interface MasterBook {
  book: BookMeta;
  units: Unit[];
  stats: BookStats;
}

export interface BookListItem {
  id: string;
  title: string;
  subject: Subject;
  grade: Grade;
  total_pages: number;
  extraction_status: ExtractionStatus;
  extraction_progress: number;
  total_lessons: number;
  videos_generated: number;
  created_at: string;
}

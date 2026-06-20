/**
 * API-related TypeScript types
 * @module types/api
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadResult {
  success: boolean;
  book_id: string;
  filename: string;
  size: number;
  total_pages?: number;
}

export interface ExtractionStartResult {
  success: boolean;
  book_id: string;
  message: string;
  estimated_time_minutes?: number;
}

export interface ExtractionStatusResponse {
  book_id: string;
  status: 'pending' | 'extracting' | 'completed' | 'failed' | 'partial';
  progress: number; // 0-100
  current_page?: number;
  total_pages?: number;
  pages_extracted?: number;
  pages_failed?: number;
  started_at?: string;
  estimated_completion?: string;
  errors?: Array<{ page: number; error: string }>;
}

export interface VideoGenerateResult {
  success: boolean;
  book_id: string;
  lesson_id: string;
  message: string;
  estimated_duration_sec?: number;
}

export interface VideoStatusResponse {
  book_id: string;
  lesson_id: string;
  status: 'not_generated' | 'generating' | 'generated' | 'failed' | 'cancelled';
  progress: number; // 0-100
  current_step?: string;
  started_at?: string;
  completed_at?: string;
  video_url?: string | null;
  file_size_mb?: number | null;
  error?: string;
  logs?: string[];
}

export interface QueueItem {
  book_id: string;
  lesson_id: string;
  lesson_title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  added_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface QueueResponse {
  active_jobs: QueueItem[];
  pending_queue: QueueItem[];
  completed: QueueItem[];
  failed: QueueItem[];
  last_updated: string;
}

export interface SystemStatus {
  cpu_percent: number;
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  gpu?: {
    name: string;
    vram_total: number;
    vram_used: number;
    vram_free: number;
    utilization: number;
  };
  uptime_sec: number;
}

export interface ExportEducationResult {
  success: boolean;
  exported_lessons: number;
  export_path: string;
  exported_at: string;
}

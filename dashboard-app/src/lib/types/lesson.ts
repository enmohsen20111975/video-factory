/**
 * Lesson-related TypeScript types
 * @module types/lesson
 */

export type QuestionType = 'mcq' | 'numerical' | 'conceptual' | 'true_false';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SceneType = 'intro' | 'title' | 'formula' | 'simulator' | 'mindmap' | 'quiz' | 'outro' | 'image' | 'table';

export interface Definition {
  id: string;
  term: string;
  definition: string;
}

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit: string;
}

export interface Formula {
  id: string;
  latex: string;
  description: string;
  variables: FormulaVariable[];
}

export interface Explanation {
  id: string;
  title: string;
  text: string;
  image_id?: string;
  order: number;
}

export interface LessonImage {
  id: string;
  source_page: number;
  path: string;
  description: string;
  type: 'circuit' | 'graph' | 'diagram' | 'photo' | 'illustration' | 'other';
  width?: number;
  height?: number;
}

export interface LessonTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[]; // for MCQ
  correct_index?: number; // for MCQ
  answer?: string; // for numerical
  is_true?: boolean; // for true_false
  explanation: string;
  formula_used?: string;
}

export interface Scene {
  type: SceneType;
  duration_sec: number;
  title?: string;
  formula_id?: string | null;
  question_ids?: string[];
  config?: Record<string, unknown>;
  image_id?: string;
  table_id?: string;
}

export interface VideoInfo {
  status: 'not_generated' | 'generating' | 'generated' | 'failed' | 'cancelled';
  script_text: string;
  voice: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_sec: number;
  rendered_at: string | null;
  render_log: string | null;
  file_size_mb: number | null;
}

export interface ExtractionMeta {
  extracted_at: string;
  model: string;
  confidence: number;
  needs_review: boolean;
  review_notes: string;
}

export interface LessonContent {
  raw_text: string;
  summary: string;
  objectives: string[];
  definitions: Definition[];
  formulas: Formula[];
  explanations: Explanation[];
}

export interface LessonMetadata {
  book_id: string;
  unit_id: string;
  lesson_id: string;
  title: string;
  subtitle: string;
  page_start: number;
  page_end: number;
  subject: string;
  grade: string;
  duration_minutes: number;
  difficulty: Difficulty;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  metadata: LessonMetadata;
  content: LessonContent;
  images: LessonImage[];
  tables: LessonTable[];
  questions: Question[];
  scenes: Scene[];
  video: VideoInfo;
  extraction_meta: ExtractionMeta;
}

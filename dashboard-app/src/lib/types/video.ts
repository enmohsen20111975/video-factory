/**
 * Video configuration types
 * @module types/video
 */

export interface TTSConfig {
  voice: string;
  rate: string;
  pitch: string;
  volume: number;
}

export interface RemotionConfig {
  concurrency: number;
  fps: number;
  resolution_width: number;
  resolution_height: number;
  bg_music_volume: number;
}

export interface FFmpegConfig {
  crf: number;
  preset: string;
  pix_fmt: string;
  audio_bitrate: string;
  cleanup_raw: boolean;
}

export interface VLMConfig {
  preferred_model: string;
  fallback_chain: string[];
  cooldown_seconds: number;
  vram_limit_mb: number;
  gpu_check_retries: number;
  gpu_retry_wait_seconds: number;
  temperature: number;
  max_tokens: number;
  context_window: number;
  json_parse_retries: number;
}

export interface R2Config {
  enabled: boolean;
  account_id: string;
  access_key_id: string;
  secret_access_key: string;
  bucket_name: string;
  public_url_base: string;
}

export interface PipelineConfig {
  global: {
    project_name: string;
    language: string;
    debug_mode: boolean;
  };
  stage_1_pdf_to_image: {
    dpi: number;
    max_size: number;
    image_format: string;
    optimize: boolean;
    auto_crop: boolean;
  };
  stage_2_vlm_extraction: VLMConfig;
  stage_3_merger: {
    confidence_threshold: number;
    deduplication_strategy: string;
    flag_needs_review: boolean;
  };
  stage_4_generator: {
    voiceover_dialect: 'egyptian_colloquial' | 'standard_arabic';
    mcq_questions_count: number;
    output_formats: string;
  };
  stage_5_video_factory: {
    tts: TTSConfig;
    remotion: RemotionConfig;
    ffmpeg: FFmpegConfig;
  };
  stage_6_distribution: {
    r2: R2Config;
    auto_upload: boolean;
    update_education_platform: boolean;
  };
}

export interface VideoRenderProgress {
  step: 'script' | 'tts' | 'render' | 'compress' | 'upload' | 'done' | 'failed';
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

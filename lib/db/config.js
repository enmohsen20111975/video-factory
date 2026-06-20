/**
 * Config Database Access Layer
 * Manages pipeline-config.json
 * @module lib/db/config
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'data', 'config', 'pipeline-config.json');

const DEFAULT_CONFIG = {
  global: {
    project_name: 'Smart Education Factory',
    language: 'ar-EG',
    debug_mode: false,
  },
  stage_1_pdf_to_image: {
    dpi: 150,
    max_size: 512,
    image_format: 'PNG',
    optimize: true,
    auto_crop: false,
  },
  stage_2_vlm_extraction: {
    preferred_model: 'qwen2-vl:7b',
    fallback_chain: ['qwen2-vl:7b', 'gemma3:4b', 'qwen2-vl:2b'],
    cooldown_seconds: 10,
    vram_limit_mb: 7168,
    gpu_check_retries: 3,
    gpu_retry_wait_seconds: 30,
    temperature: 0.1,
    max_tokens: 2048,
    context_window: 4096,
    json_parse_retries: 3,
  },
  stage_3_merger: {
    confidence_threshold: 0.6,
    deduplication_strategy: 'latex_formula_and_term',
    flag_needs_review: true,
  },
  stage_4_generator: {
    voiceover_dialect: 'egyptian_colloquial',
    mcq_questions_count: 5,
    output_formats: 'both',
  },
  stage_5_video_factory: {
    tts: {
      voice: 'ar-EG-SalmaNeural',
      rate: '+5%',
      pitch: '+0Hz',
      volume: 1.0,
    },
    remotion: {
      concurrency: 4,
      fps: 30,
      resolution_width: 1920,
      resolution_height: 1080,
      bg_music_volume: 0.15,
    },
    ffmpeg: {
      crf: 22,
      preset: 'fast',
      pix_fmt: 'yuv420p',
      audio_bitrate: '128k',
      cleanup_raw: true,
    },
  },
  stage_6_distribution: {
    r2: {
      enabled: false,
      account_id: '',
      access_key_id: '',
      secret_access_key: '',
      bucket_name: '',
      public_url_base: '',
    },
    auto_upload: false,
    update_education_platform: false,
  },
};

function ensureConfigFile() {
  const configDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
}

function getConfig() {
  ensureConfigFile();
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading config, using default:', e.message);
    return DEFAULT_CONFIG;
  }
}

function saveConfig(newConfig) {
  ensureConfigFile();
  // Merge with default to ensure all fields exist
  const merged = deepMerge(DEFAULT_CONFIG, newConfig);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function resetConfig() {
  ensureConfigFile();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  return DEFAULT_CONFIG;
}

module.exports = {
  getConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG,
};

/**
 * API Client for Unified Video Factory backend
 * Backend runs at http://localhost:3001 by default (override via NEXT_PUBLIC_API_URL)
 */

import type {
  ApiResponse,
  BookListItem,
  MasterBook,
  Lesson,
  QueueResponse,
  SystemStatus,
  UploadResult,
  ExtractionStartResult,
  ExtractionStatusResponse,
  VideoGenerateResult,
  VideoStatusResponse,
  ExportEducationResult,
} from "@/lib/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const API_DATA_URL = API_BASE_URL; // images & files served from same origin

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  return headers;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  let data: unknown;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error)
        : typeof data === "string"
          ? data
          : `Request failed: ${res.status} ${res.statusText}`);
    throw new Error(msg);
  }

  return data as T;
}

// ============ Books API ============

export const booksApi = {
  list(): Promise<BookListItem[]> {
    return request<ApiResponse<BookListItem[]>>(`/api/books`).then(
      (r) => r.data ?? [],
    );
  },

  get(bookId: string): Promise<MasterBook> {
    return request<ApiResponse<MasterBook>>(`/api/books/${bookId}`).then(
      (r) => r.data!,
    );
  },

  async upload(file: File, meta: {
    title: string;
    subject: string;
    grade: string;
    publisher?: string;
  }): Promise<UploadResult> {
    const form = new FormData();
    form.append("pdf", file);
    form.append("title", meta.title);
    form.append("subject", meta.subject);
    form.append("grade", meta.grade);
    if (meta.publisher) form.append("publisher", meta.publisher);

    const res = await fetch(`${API_BASE_URL}/api/books/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Upload failed: ${res.status} ${txt}`);
    }
    return (await res.json()) as UploadResult;
  },

  remove(bookId: string): Promise<ApiResponse<{ book_id: string }>> {
    return request(`/api/books/${bookId}`, { method: "DELETE" });
  },

  startExtraction(bookId: string): Promise<ExtractionStartResult> {
    return request<ExtractionStartResult>(
      `/api/books/${bookId}/extract`,
      { method: "POST" },
    );
  },

  stopExtraction(bookId: string): Promise<ApiResponse<{ stopped: boolean }>> {
    return request(`/api/books/${bookId}/extract/stop`, { method: "POST" });
  },

  getExtractionStatus(bookId: string): Promise<ExtractionStatusResponse> {
    return request<ExtractionStatusResponse>(
      `/api/books/${bookId}/extract/status`,
    );
  },

  getLogs(bookId: string): Promise<{ logs: string[] }> {
    return request<{ logs?: string[] }>(`/api/books/${bookId}/logs`).then(
      (r) => ({ logs: r.logs ?? [] }),
    );
  },
};

// ============ Lessons API ============

export const lessonsApi = {
  get(bookId: string, lessonId: string): Promise<Lesson> {
    return request<ApiResponse<Lesson>>(
      `/api/books/${bookId}/lessons/${lessonId}`,
    ).then((r) => r.data!);
  },

  update(
    bookId: string,
    lessonId: string,
    lesson: Partial<Lesson>,
  ): Promise<ApiResponse<{ saved: boolean }>> {
    return request(`/api/books/${bookId}/lessons/${lessonId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lesson),
    });
  },

  async uploadImage(
    bookId: string,
    lessonId: string,
    file: File,
    description?: string,
  ): Promise<ApiResponse<{ image_id: string; path: string }>> {
    const form = new FormData();
    form.append("image", file);
    if (description) form.append("description", description);
    const res = await fetch(
      `${API_BASE_URL}/api/books/${bookId}/lessons/${lessonId}/images`,
      {
        method: "POST",
        body: form,
      },
    );
    if (!res.ok) {
      throw new Error(`Image upload failed: ${res.status}`);
    }
    return (await res.json()) as ApiResponse<{ image_id: string; path: string }>;
  },

  deleteImage(
    bookId: string,
    lessonId: string,
    imageId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return request(
      `/api/books/${bookId}/lessons/${lessonId}/images/${imageId}`,
      { method: "DELETE" },
    );
  },

  markReviewed(
    bookId: string,
    lessonId: string,
  ): Promise<ApiResponse<{ reviewed: boolean }>> {
    return request(
      `/api/books/${bookId}/lessons/${lessonId}/review`,
      { method: "POST" },
    );
  },
};

// ============ Videos API ============

export const videosApi = {
  getQueue(): Promise<QueueResponse> {
    return request<QueueResponse>(`/api/videos/queue`);
  },

  generate(
    bookId: string,
    lessonId: string,
  ): Promise<VideoGenerateResult> {
    return request<VideoGenerateResult>(
      `/api/videos/generate/${bookId}/${lessonId}`,
      { method: "POST" },
    );
  },

  generateBatch(items: Array<{ book_id: string; lesson_id: string }>): Promise<
    ApiResponse<{ queued: number }>
  > {
    return request(`/api/videos/generate-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  },

  getStatus(bookId: string, lessonId: string): Promise<VideoStatusResponse> {
    return request<VideoStatusResponse>(
      `/api/videos/status/${bookId}/${lessonId}`,
    );
  },

  cancel(
    bookId: string,
    lessonId: string,
  ): Promise<ApiResponse<{ cancelled: boolean }>> {
    return request(`/api/videos/cancel/${bookId}/${lessonId}`, {
      method: "POST",
    });
  },

  getFileUrl(bookId: string, lessonId: string): string {
    return `${API_BASE_URL}/api/videos/${bookId}/${lessonId}/file`;
  },

  exportEducation(bookId?: string): Promise<ExportEducationResult> {
    return request(`/api/videos/export-education`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: bookId }),
    });
  },
};

// ============ Pipeline / Config API ============

export interface PipelineConfigPayload {
  vlm?: {
    preferred_model?: string;
    cooldown_seconds?: number;
    vram_limit_mb?: number;
    temperature?: number;
    max_tokens?: number;
  };
  tts?: {
    voice?: string;
    rate?: string;
    pitch?: string;
    volume?: number;
  };
  video?: {
    fps?: number;
    resolution_width?: number;
    resolution_height?: number;
    concurrency?: number;
    crf?: number;
    preset?: string;
  };
  r2?: {
    enabled?: boolean;
    account_id?: string;
    access_key_id?: string;
    secret_access_key?: string;
    bucket_name?: string;
    public_url_base?: string;
  };
}

export const pipelineApi = {
  getConfig(): Promise<PipelineConfigPayload> {
    return request<ApiResponse<PipelineConfigPayload>>(`/api/config`).then(
      (r) => r.data ?? {},
    );
  },

  saveConfig(config: PipelineConfigPayload): Promise<ApiResponse<{ saved: boolean }>> {
    return request(`/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  },

  getSystemStatus(): Promise<SystemStatus> {
    return request<SystemStatus>(`/api/system/status`);
  },

  testR2(): Promise<ApiResponse<{ ok: boolean; message?: string }>> {
    return request(`/api/r2/test`, { method: "POST" });
  },
};

// ============ Helpers ============

export function imageUrl(bookId: string, imagePath: string): string {
  // imagePath could be either "images/..." or absolute
  if (imagePath.startsWith("http")) return imagePath;
  const clean = imagePath.replace(/^\/+/, "");
  return `${API_DATA_URL}/data/books/${bookId}/${clean}`;
}

export function videoFileUrl(bookId: string, lessonId: string): string {
  return videosApi.getFileUrl(bookId, lessonId);
}

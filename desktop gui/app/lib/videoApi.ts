import { openAiBlob, openAiFetch, openAiJson } from "./http";
import { dataUrlToFile } from "./media";

const DEFAULT_VIDEO_MODEL = "grok-imagine-video";

export type VideoJobStatus = "queued" | "in_progress" | "completed" | "failed";

export async function createVideoJob(params: {
  prompt: string;
  seconds: number;
  size: string;
  resolutionName: string | null;
  preset: string;
  baseImageDataUrl: string | null;
}): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append("model", DEFAULT_VIDEO_MODEL);
  fd.append("prompt", params.prompt);
  fd.append("seconds", String(params.seconds));
  fd.append("size", params.size);
  if (params.resolutionName) {
    fd.append("resolution_name", params.resolutionName);
  }
  if (params.preset) {
    fd.append("preset", params.preset);
  }
  if (params.baseImageDataUrl) {
    const f = await dataUrlToFile(params.baseImageDataUrl, "ref.png");
    fd.append("input_reference", f, f.name);
  }
  const res = await openAiFetch("/v1/videos", { method: "POST", body: fd });
  return res.json() as Promise<{ id: string }>;
}

export async function getVideoJob(id: string): Promise<{
  id: string;
  status: VideoJobStatus | string;
  error?: { message?: string };
}> {
  return openAiJson(`/v1/videos/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function waitForVideoCompletion(
  id: string,
  opts: { signal?: AbortSignal; pollMs?: number } = {},
): Promise<void> {
  const poll = opts.pollMs ?? 2000;
  for (;;) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const j = await getVideoJob(id);
    if (j.status === "completed" || j.status === "failed") return;
    await new Promise((r) => setTimeout(r, poll));
  }
}

export async function fetchVideoMp4Blob(videoId: string): Promise<Blob> {
  return openAiBlob(`/v1/videos/${encodeURIComponent(videoId)}/content`);
}

import { openAiFetch } from "./http";
import { dataUrlToFile } from "./media";

export type ImageGenResult = { id: string; url: string; prompt: string };

function parseResults(j: { data?: Array<{ url?: string; b64_json?: string }> }, prompt: string): ImageGenResult[] {
  return (j.data ?? []).map((d, i) => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    url: d.url || `data:image/png;base64,${d.b64_json ?? ""}`,
    prompt,
  }));
}

export async function generateImagesJson(
  prompt: string,
  model: string,
  n: number,
  size: string,
): Promise<ImageGenResult[]> {
  const res = await openAiFetch("/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      n,
      size,
      response_format: "url",
    }),
  });
  const j = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  return parseResults(j, prompt);
}

export async function editImagesMultipart(
  prompt: string,
  model: string,
  n: number,
  size: string,
  imageDataUrl: string,
): Promise<ImageGenResult[]> {
  const file = await dataUrlToFile(imageDataUrl, "base.png");
  const fd = new FormData();
  fd.append("model", model);
  fd.append("prompt", prompt);
  fd.append("n", String(n));
  fd.append("size", size);
  fd.append("response_format", "url");
  fd.append("image[]", file, file.name);
  const res = await openAiFetch("/v1/images/edits", { method: "POST", body: fd });
  const j = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  return parseResults(j, prompt);
}

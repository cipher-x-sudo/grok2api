import { ApiError, formatDetail, openAiFetchRaw } from "./http";

export type ChatStreamChunk = {
  contentDelta: string;
  reasoningDelta: string;
};

export async function* iterateChatCompletionStream(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamChunk> {
  const res = await openAiFetchRaw("/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    const errBody = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");
    throw new ApiError(formatDetail(errBody) || res.statusText, res.status, errBody);
  }

  if (ct.includes("application/json")) {
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    };
    const msg = data.choices?.[0]?.message;
    const c = msg?.content ?? "";
    const r = msg?.reasoning_content ?? "";
    if (c) yield { contentDelta: c, reasoningDelta: "" };
    if (r) yield { contentDelta: "", reasoningDelta: r };
    return;
  }

  if (!res.body) {
    throw new ApiError("Empty response body", 500, null);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith(":")) continue;
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") return;
      let json: unknown;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const choices = (json as { choices?: unknown[] }).choices;
      const choice0 = Array.isArray(choices) ? (choices[0] as Record<string, unknown> | undefined) : undefined;
      const delta = choice0?.delta as Record<string, unknown> | undefined;
      if (!delta) continue;
      const content = typeof delta.content === "string" ? delta.content : "";
      const reasoning =
        typeof delta.reasoning_content === "string"
          ? delta.reasoning_content
          : typeof (delta as { reasoning?: string }).reasoning === "string"
            ? (delta as { reasoning: string }).reasoning
            : "";
      if (content || reasoning) {
        yield { contentDelta: content, reasoningDelta: reasoning };
      }
    }
  }
}

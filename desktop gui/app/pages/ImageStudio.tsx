import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Trash2,
  ListPlus,
  CornerDownLeft,
} from "lucide-react";
import { toast } from "sonner";
import { HTMLGallery } from "../components/HTMLGallery";
import { loadSettings } from "@/lib/settings";
import { editImagesMultipart, generateImagesJson } from "@/lib/imagesApi";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

interface QueueItem {
  id: string;
  prompt: string;
  status: "pending" | "generating" | "done" | "error";
  imagesPerPrompt: number;
  results: GeneratedImage[];
  model: string;
  resolution: string;
  baseImage: string | null;
}

const MODELS = [
  { value: "grok-imagine-image", label: "Standard" },
  { value: "grok-imagine-image-pro", label: "Pro" },
  { value: "grok-imagine-lite", label: "Lite" },
  { value: "grok-imagine-edit", label: "Edit" },
];

const RESOLUTIONS = ["1024x1024", "1280x720", "720x1280"];

export function ImageStudio() {
  const [promptText, setPromptText] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("grok-imagine-image-pro");
  const [resolution, setResolution] = useState("1024x1024");
  const [imagesPerPrompt, setImagesPerPrompt] = useState(2);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [allImages, setAllImages] = useState<GeneratedImage[]>([]);
  const processingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const promptLines = promptText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setBaseImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addToQueue = useCallback(() => {
    if (promptLines.length === 0) return;

    const newItems: QueueItem[] = promptLines.map((line) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt: line,
      status: "pending",
      imagesPerPrompt,
      results: [],
      model: selectedModel,
      resolution,
      baseImage,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    setPromptText("");
    textareaRef.current?.focus();
  }, [promptLines, imagesPerPrompt, selectedModel, resolution, baseImage]);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    let cancelled = false;

    async function loop() {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled || processingRef.current) continue;
        const pending = queueRef.current.find((q) => q.status === "pending");
        if (!pending) continue;

        processingRef.current = true;
        setQueue((prev) =>
          prev.map((q) => (q.id === pending.id ? { ...q, status: "generating" } : q)),
        );

        try {
          const { apiKey } = loadSettings();
          if (!apiKey) throw new Error("Configure API key in API Setup");

          let model = pending.model;
          if (pending.baseImage && !model.includes("edit")) {
            model = "grok-imagine-edit";
          }

          const results = pending.baseImage
            ? await editImagesMultipart(
                pending.prompt,
                model,
                pending.imagesPerPrompt,
                pending.resolution,
                pending.baseImage,
              )
            : await generateImagesJson(
                pending.prompt,
                model,
                pending.imagesPerPrompt,
                pending.resolution,
              );

          const tagged = results.map((r) => ({ ...r, prompt: pending.prompt }));
          if (cancelled) break;
          setQueue((prev) =>
            prev.map((q) =>
              q.id === pending.id ? { ...q, status: "done", results: tagged } : q,
            ),
          );
          setAllImages((prev) => [...tagged, ...prev]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Image request failed";
          toast.error(msg);
          if (!cancelled) {
            setQueue((prev) =>
              prev.map((q) =>
                q.id === pending.id ? { ...q, status: "error", results: [] } : q,
              ),
            );
          }
        } finally {
          processingRef.current = false;
        }
      }
    }

    void loop();
    return () => {
      cancelled = true;
    };
  }, []);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((q) => q.status !== "done"));
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const generatingCount = queue.filter((q) => q.status === "generating").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-card/50">
        <ImageIcon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Image Studio</span>
        <div className="flex items-center gap-3 ml-2">
          {generatingCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              {generatingCount} generating
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {pendingCount} queued
            </span>
          )}
          {doneCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <CheckCircle2 className="w-3 h-3" />
              {doneCount} done
            </span>
          )}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {allImages.length} images total
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-[320px] border-r border-border bg-card/30 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Prompt input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Prompts
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {promptLines.length === 0
                    ? "1 line = 1 prompt"
                    : `${promptLines.length} prompt${promptLines.length > 1 ? "s" : ""}`}
                </span>
              </div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      addToQueue();
                    }
                  }}
                  placeholder={"A sunset over mountains\nCyberpunk city at night\nAbstract art in pastels"}
                  className="w-full gradio-input px-3 py-2.5 resize-none text-sm font-mono leading-relaxed"
                  rows={5}
                />
                {/* Line numbers */}
                {promptLines.length > 0 && (
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      {promptLines.map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/40"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                  new line = new prompt
                </span>
              </div>
            </div>

            {/* Base Image */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Base Image <span className="text-muted-foreground/60">(optional)</span>
              </label>
              {baseImage ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={baseImage}
                    alt="Base"
                    className="w-full rounded-lg border border-border"
                  />
                  <button
                    onClick={() => setBaseImage(null)}
                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-md hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="block border border-dashed border-border rounded-lg p-5 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Drop or click</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Model
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setSelectedModel(m.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedModel === m.value
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution + Images per prompt */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full gradio-input px-3 py-2 text-sm cursor-pointer"
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Per Prompt
                </label>
                <select
                  value={imagesPerPrompt}
                  onChange={(e) => setImagesPerPrompt(Number(e.target.value))}
                  className="w-full gradio-input px-3 py-2 text-sm cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} image{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add to Queue */}
            <button
              onClick={addToQueue}
              disabled={promptLines.length === 0}
              className="gradio-button w-full flex items-center justify-center gap-2 text-sm"
            >
              <ListPlus className="w-4 h-4" />
              Add {promptLines.length || 0} Prompt
              {promptLines.length !== 1 ? "s" : ""} to Queue
            </button>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="border-t border-border">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Queue ({queue.length})
                </span>
                {doneCount > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear done
                  </button>
                )}
              </div>
              <div className="max-h-[240px] overflow-y-auto px-2 pb-2 space-y-1">
                <AnimatePresence>
                  {queue.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                          item.status === "generating"
                            ? "bg-primary/5 border border-primary/15"
                            : item.status === "done"
                            ? "bg-green-500/5 border border-green-500/10"
                            : "bg-muted/30 border border-transparent"
                        }`}
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {item.status === "generating" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : item.status === "done" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Prompt */}
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{item.prompt}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.imagesPerPrompt} img{item.imagesPerPrompt > 1 ? "s" : ""}
                            {item.status === "done" &&
                              ` · ${item.results.length} generated`}
                          </p>
                        </div>

                        {/* Remove */}
                        {item.status === "pending" && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                        {item.status === "done" && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-5">
          {allImages.length === 0 && queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">No images yet</h3>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Write one prompt per line, then add to queue. Each line generates
                independently.
              </p>
            </div>
          ) : allImages.length === 0 && queue.some((q) => q.status !== "done") ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="aspect-[4/5] bg-gradient-to-br from-muted to-muted/50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <HTMLGallery images={allImages} />
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  Video as VideoIcon,
  X,
  ListPlus,
  CornerDownLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  createVideoJob,
  fetchVideoMp4Blob,
  waitForVideoCompletion,
} from "@/lib/videoApi";
import { loadSettings } from "@/lib/settings";

interface VideoJob {
  clientKey: string;
  id: string;
  prompt: string;
  displayStatus: "Processing" | "Ready" | "Failed";
  videoBlobUrl: string | null;
  error?: string;
}

const DURATIONS = [6, 10, 12, 16, 20];
const RESOLUTIONS = ["480p", "720p"] as const;
const STYLES = ["fun", "normal", "spicy"] as const;

export function VideoStudio() {
  const [promptText, setPromptText] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("720p");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("normal");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);

  const promptLines = promptText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  useEffect(() => {
    return () => {
      for (const j of jobsRef.current) {
        if (j.videoBlobUrl) URL.revokeObjectURL(j.videoBlobUrl);
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setBaseImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (promptLines.length === 0) return;
    const { apiKey } = loadSettings();
    if (!apiKey) {
      toast.error("Configure API key in API Setup");
      return;
    }

    const newJobs: VideoJob[] = promptLines.map((line) => {
      const clientKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return {
        clientKey,
        id: "",
        prompt: line.slice(0, 120) + (line.length > 120 ? "…" : ""),
        displayStatus: "Processing" as const,
        videoBlobUrl: null,
      };
    });

    setJobs((prev) => [...newJobs, ...prev]);
    setPromptText("");
    toast.success(`${newJobs.length} video task${newJobs.length > 1 ? "s" : ""} queued`);

    for (let i = 0; i < promptLines.length; i++) {
      const line = promptLines[i]!;
      const clientKey = newJobs[i]!.clientKey;

      void (async () => {
        try {
          const created = await createVideoJob({
            prompt: line,
            seconds: duration,
            size: "720x1280",
            resolutionName: resolution,
            preset: style,
            baseImageDataUrl: baseImage,
          });
          const videoId = created.id;
          setJobs((prev) =>
            prev.map((j) => (j.clientKey === clientKey ? { ...j, id: videoId } : j)),
          );
          await waitForVideoCompletion(videoId);
          const blob = await fetchVideoMp4Blob(videoId);
          const url = URL.createObjectURL(blob);
          setJobs((prev) =>
            prev.map((j) =>
              j.clientKey === clientKey
                ? { ...j, displayStatus: "Ready", videoBlobUrl: url }
                : j,
            ),
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Video failed";
          toast.error(msg);
          setJobs((prev) =>
            prev.map((j) =>
              j.clientKey === clientKey ? { ...j, displayStatus: "Failed", error: msg } : j,
            ),
          );
        }
      })();
    }
  };

  const downloadCurrent = () => {
    if (!currentVideo) return;
    const a = document.createElement("a");
    a.href = currentVideo;
    a.download = "grok-video.mp4";
    a.click();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-card/50">
        <VideoIcon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Video Studio</span>
        <span className="text-xs text-muted-foreground ml-1">{jobs.length} in queue</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[300px] border-r border-border bg-card/30 overflow-y-auto shrink-0 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">Scene Prompts</label>
              <span className="text-[10px] text-muted-foreground">
                {promptLines.length === 0
                  ? "1 line = 1 video"
                  : `${promptLines.length} video${promptLines.length > 1 ? "s" : ""}`}
              </span>
            </div>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={"A cat walking on a beach\nDrone shot of a city\nTime-lapse of flowers"}
              className="w-full gradio-input px-3 py-2.5 resize-none text-sm font-mono leading-relaxed"
              rows={4}
            />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CornerDownLeft className="w-2.5 h-2.5" />
                new line = new video task
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Reference Image
            </label>
            {baseImage ? (
              <div className="relative rounded-lg overflow-hidden">
                <img src={baseImage} alt="Base" className="w-full rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => setBaseImage(null)}
                  className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="block border border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <Upload className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Drop or click</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Duration</label>
            <div className="flex gap-1 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 min-w-[48px] py-1.5 rounded-md text-xs transition-colors ${
                    duration === d
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as (typeof RESOLUTIONS)[number])}
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as (typeof STYLES)[number])}
                className="w-full gradio-input px-3 py-2 text-sm cursor-pointer"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={promptLines.length === 0}
            className="gradio-button w-full flex items-center justify-center gap-2 text-sm"
          >
            <ListPlus className="w-4 h-4" />
            Queue {promptLines.length || 0} Video{promptLines.length !== 1 ? "s" : ""}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="gradio-panel overflow-hidden">
            <div className="aspect-video bg-muted/30">
              {currentVideo ? (
                <video src={currentVideo} controls className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <VideoIcon className="w-10 h-10 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">Select a completed job to preview</span>
                </div>
              )}
            </div>
            {currentVideo && (
              <div className="p-3 border-t border-border">
                <button
                  type="button"
                  onClick={downloadCurrent}
                  className="gradio-button w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download MP4
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Queue ({jobs.length})</h3>
            {jobs.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No tasks yet</div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job, i) => (
                  <motion.div
                    key={job.clientKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if (job.displayStatus === "Ready" && job.videoBlobUrl) {
                        setCurrentVideo(job.videoBlobUrl);
                      }
                    }}
                    className={`gradio-panel p-3 flex items-center gap-3 ${
                      job.displayStatus === "Ready" && job.videoBlobUrl ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      {job.displayStatus === "Processing" ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : job.displayStatus === "Ready" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{job.prompt}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {job.id || "…"}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md shrink-0 ${
                        job.displayStatus === "Ready"
                          ? "bg-green-500/10 text-green-500"
                          : job.displayStatus === "Failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {job.displayStatus}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

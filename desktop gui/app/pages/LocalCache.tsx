import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Trash2,
  AlertTriangle,
  Database,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Download,
  Eye,
  X,
  Grid3X3,
  List,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch, adminJson } from "@/lib/http";
import { loadSettings, normalizeBaseUrl } from "@/lib/settings";

interface CachedAsset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  tooltip: string;
  size: string;
  sizeBytes: number;
  date: string;
  modifiedAt: number;
}

type FileTypeFilter = "all" | "images" | "videos";

/** Basename without the last extension (e.g. `a.b.mp4` → `a.b`). Matches server `/v1/files/*?id=` stem rules. */
function fileStem(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtTime(ts: number): string {
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleString();
}

export function LocalCache() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileType, setFileType] = useState<FileTypeFilter>("all");
  const [showClearModal, setShowClearModal] = useState(false);
  const [assets, setAssets] = useState<CachedAsset[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewAsset, setPreviewAsset] = useState<CachedAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { adminKey } = loadSettings();
    if (!adminKey) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const b = normalizeBaseUrl(loadSettings().baseUrl);
      const listOf = async (t: "image" | "video") => {
        const j = await adminJson<{
          items?: { name: string; size_bytes: number; modified_at: number }[];
        }>(`/admin/api/cache/list?type=${t}&page=1&page_size=5000`, { method: "GET" });
        return j.items ?? [];
      };
      const [imgItems, vidItems] = await Promise.all([listOf("image"), listOf("video")]);
      const out: CachedAsset[] = [];
      for (const it of imgItems) {
        const stem = fileStem(it.name);
        const url = `${b}/v1/files/image?id=${encodeURIComponent(stem)}`;
        out.push({
          id: `image:${it.name}`,
          name: it.name,
          url,
          type: "image",
          tooltip: `${it.name}\n${fmtBytes(it.size_bytes)}\n${fmtTime(it.modified_at)}`,
          size: fmtBytes(it.size_bytes),
          sizeBytes: it.size_bytes,
          date: fmtTime(it.modified_at),
          modifiedAt: it.modified_at,
        });
      }
      for (const it of vidItems) {
        const stem = fileStem(it.name);
        const url = `${b}/v1/files/video?id=${encodeURIComponent(stem)}`;
        out.push({
          id: `video:${it.name}`,
          name: it.name,
          url,
          type: "video",
          tooltip: `${it.name}\n${fmtBytes(it.size_bytes)}\n${fmtTime(it.modified_at)}`,
          size: fmtBytes(it.size_bytes),
          sizeBytes: it.size_bytes,
          date: fmtTime(it.modified_at),
          modifiedAt: it.modified_at,
        });
      }
      out.sort((a, b) => b.modifiedAt - a.modifiedAt);
      setAssets(out);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load cache");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredAssets = assets.filter((a) => {
    const matchType =
      fileType === "all" ||
      (fileType === "images" && a.type === "image") ||
      (fileType === "videos" && a.type === "video");
    const q = searchQuery.toLowerCase();
    return (
      matchType &&
      (a.name.toLowerCase().includes(q) ||
        a.tooltip.toLowerCase().includes(q) ||
        a.size.toLowerCase().includes(q))
    );
  });

  const totalBytes = assets.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);
  const totalSizeLabel = assets.length === 0 ? "—" : fmtBytes(totalBytes);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteOne = async (asset: CachedAsset) => {
    const type = asset.type === "image" ? "image" : "video";
    try {
      await adminFetch("/admin/api/cache/item/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: asset.name }),
      });
      setAssets((p) => p.filter((x) => x.id !== asset.id));
      setSelectedIds((p) => {
        const n = new Set(p);
        n.delete(asset.id);
        return n;
      });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const deleteSelected = async () => {
    const selected = assets.filter((a) => selectedIds.has(a.id));
    if (selected.length === 0) return;
    const byType = { image: [] as string[], video: [] as string[] };
    for (const a of selected) {
      if (a.type === "image") byType.image.push(a.name);
      else byType.video.push(a.name);
    }
    try {
      if (byType.image.length) {
        await adminFetch("/admin/api/cache/items/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "image", names: byType.image }),
        });
      }
      if (byType.video.length) {
        await adminFetch("/admin/api/cache/items/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "video", names: byType.video }),
        });
      }
      setAssets((p) => p.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const clearAll = async () => {
    try {
      await adminFetch("/admin/api/cache/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image" }),
      });
      await adminFetch("/admin/api/cache/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "video" }),
      });
      setAssets([]);
      setSelectedIds(new Set());
      setShowClearModal(false);
      toast.success("Cache cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-card/50">
        <Database className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Local Cache</span>
        <span className="text-xs text-muted-foreground">
          {assets.length} assets · {totalSizeLabel}
        </span>

        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files…"
              className="gradio-input pl-8 pr-3 py-1.5 text-xs w-52"
            />
          </div>

          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as FileTypeFilter)}
            className="gradio-input px-2.5 py-1.5 text-xs cursor-pointer"
          >
            <option value="all">All</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
          </select>

          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 border-l border-border transition-colors ${
                viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Refresh"}
          </button>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => void deleteSelected()}
              className="px-2.5 py-1.5 text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
            >
              Delete {selectedIds.size}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!loadSettings().adminKey && (
          <p className="text-sm text-muted-foreground mb-4 rounded-lg border border-border p-4">
            Set an <strong>Admin API key</strong> in API Setup to list and manage local cache.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading cache…
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <h3 className="text-sm font-medium mb-1">No cached assets</h3>
            <p className="text-xs text-muted-foreground">Files saved by the gateway appear here</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <AnimatePresence>
              {filteredAssets.map((asset, i) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.02 }}
                  title={asset.tooltip}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${
                    selectedIds.has(asset.id) ? "border-primary" : "border-transparent"
                  }`}
                >
                  <div className="aspect-square bg-muted">
                    {asset.type === "image" ? (
                      <img src={asset.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={asset.url} className="w-full h-full object-cover" muted playsInline />
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-[11px] line-clamp-3 mb-2 whitespace-pre-line">{asset.tooltip}</p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAsset(asset);
                          }}
                          className="flex-1 px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded-md text-[11px] hover:bg-white/30 transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteOne(asset);
                          }}
                          className="px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded-md hover:bg-destructive/80 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(asset.id);
                    }}
                    className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(asset.id)
                        ? "bg-primary border-primary"
                        : "border-white/50 bg-black/20 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {selectedIds.has(asset.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="absolute top-2 right-2">
                    <div className="px-1.5 py-0.5 bg-black/40 backdrop-blur-sm text-white text-[10px] rounded flex items-center gap-1">
                      {asset.type === "image" ? <ImageIcon className="w-2.5 h-2.5" /> : <Video className="w-2.5 h-2.5" />}
                      {asset.size}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="gradio-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
                      onChange={() => {
                        if (selectedIds.size === filteredAssets.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
                        }
                      }}
                      className="accent-primary w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-16">
                    Preview
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    File
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-20">
                    Type
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-20">
                    Size
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-36">
                    Modified
                  </th>
                  <th className="text-right py-2.5 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAssets.map((asset) => (
                    <motion.tr
                      key={asset.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      title={asset.tooltip}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(asset.id)}
                          onChange={() => toggleSelect(asset.id)}
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3">
                        {asset.type === "image" ? (
                          <img
                            src={asset.url}
                            alt=""
                            className="w-10 h-10 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setPreviewAsset(asset)}
                          />
                        ) : (
                          <video
                            src={asset.url}
                            className="w-10 h-10 rounded-md object-cover cursor-pointer"
                            muted
                            onClick={() => setPreviewAsset(asset)}
                          />
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <p className="text-sm truncate max-w-xs font-mono">{asset.name}</p>
                      </td>
                      <td className="py-2 px-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {asset.type === "image" ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                          {asset.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{asset.size}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{asset.date}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewAsset(asset)}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={asset.url}
                            download={asset.name}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void deleteOne(asset)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
            onClick={() => setPreviewAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="absolute -top-10 right-0 p-1.5 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              {previewAsset.type === "image" ? (
                <img
                  src={previewAsset.url}
                  alt=""
                  className="max-w-full max-h-[80vh] object-contain rounded-xl"
                />
              ) : (
                <video src={previewAsset.url} controls className="max-w-full max-h-[80vh] rounded-xl" />
              )}
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="text-white/80 text-xs max-w-lg whitespace-pre-line">{previewAsset.tooltip}</p>
                <a
                  href={previewAsset.url}
                  download={previewAsset.name}
                  className="px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gradio-panel p-5 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Clear All Cache</h3>
                <p className="text-xs text-muted-foreground">Removes all local image and video files on the server</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void clearAll()}
                className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm hover:bg-destructive/90 transition-colors"
              >
                Delete All
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

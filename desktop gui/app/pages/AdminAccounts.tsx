import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, Users, Activity, HardDrive, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminFetch, adminJson } from "@/lib/http";
import { loadSettings } from "@/lib/settings";

interface TokenRow {
  token: string;
  pool: string;
  status: string;
  quota: Record<string, { remaining: number; total: number }>;
  use_count: number;
  last_used_at: number | null;
  tags: string[];
}

function maskToken(t: string): string {
  if (t.length <= 16) return t;
  return `${t.slice(0, 8)}…${t.slice(-6)}`;
}

function poolToTier(pool: string): string {
  const p = (pool || "basic").toLowerCase();
  if (p === "heavy") return "Heavy";
  if (p === "super" || p === "expert") return "Super";
  return "Basic";
}

function statusLabel(status: string): "Active" | "Rate Limited" | "Offline" {
  const s = (status || "").toLowerCase();
  if (s === "active") return "Active";
  if (s === "cooling") return "Rate Limited";
  return "Offline";
}

function formatSynced(last: number | null): string {
  if (last == null) return "—";
  const lastSec = last > 1e12 ? Math.floor(last / 1000) : last;
  const sec = Math.floor(Date.now() / 1000 - lastSec);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}

function quotaPercent(rows: TokenRow[]): number | null {
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const q = r.quota?.expert ?? r.quota?.heavy ?? r.quota?.fast ?? r.quota?.auto;
    if (q && q.total > 0) {
      sum += q.remaining / q.total;
      n += 1;
    }
  }
  if (n === 0) return null;
  return Math.round((sum / n) * 100);
}

export function AdminAccounts() {
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [refreshingToken, setRefreshingToken] = useState<string | null>(null);
  const [cacheMb, setCacheMb] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { adminKey } = loadSettings();
    if (!adminKey) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await adminJson<{ tokens: TokenRow[] }>("/admin/api/tokens", { method: "GET" });
      setRows(Array.isArray(data.tokens) ? data.tokens : []);
      const cache = await adminJson<{
        local_image?: { size_mb?: number };
        local_video?: { size_mb?: number };
      }>("/admin/api/cache", { method: "GET" });
      const im = cache.local_image?.size_mb ?? 0;
      const vd = cache.local_video?.size_mb ?? 0;
      setCacheMb(Math.round((im + vd) * 10) / 10);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load accounts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefreshRow = async (token: string) => {
    setRefreshingToken(token);
    try {
      await adminFetch("/admin/api/batch/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: [token] }),
      });
      toast.success("Quota refreshed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshingToken(null);
    }
  };

  const handleDelete = async (token: string) => {
    try {
      await adminFetch("/admin/api/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([token]),
      });
      toast.success("Account removed");
      setShowDeleteModal(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const active = rows.filter((r) => r.status === "active").length;
  const qp = quotaPercent(rows);

  const metrics = [
    { icon: Users, label: "Accounts", value: rows.length, color: "text-primary" },
    { icon: Activity, label: "Active", value: active, color: "text-green-500" },
    {
      icon: HardDrive,
      label: "Cache (local)",
      value: cacheMb != null ? `${cacheMb} MB` : "—",
      color: "text-chart-3",
    },
    { icon: Shield, label: "Admin", value: "OK", color: "text-chart-4" },
  ];

  const tierClass = (t: string) =>
    t === "Basic"
      ? "bg-muted text-muted-foreground"
      : t === "Super"
        ? "bg-chart-4/15 text-chart-4"
        : "bg-chart-3/15 text-chart-3";

  const statusClass = (s: string) =>
    s === "Active"
      ? "text-green-500"
      : s === "Rate Limited"
        ? "text-destructive"
        : "text-orange-400";

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-card/50">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Admin & Accounts</span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto text-xs flex items-center gap-1.5 px-2 py-1 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">
          {!loadSettings().adminKey && (
            <p className="text-sm text-muted-foreground rounded-lg border border-border p-4">
              Set an <strong>Admin API key</strong> in API Setup to manage accounts.
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="gradio-panel p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div>
                  <div className="text-lg font-semibold leading-tight">{m.value}</div>
                  <div className="text-[11px] text-muted-foreground">{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="gradio-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Quota headroom (avg)</span>
              <span className="text-xs font-semibold">{qp != null ? `${qp}%` : "N/A"}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: qp != null ? `${qp}%` : "0%" }}
              />
            </div>
          </div>

          <div className="gradio-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium">Account Pool</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Token
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Last used
                      </th>
                      <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((acc) => {
                      const tier = poolToTier(acc.pool);
                      const st = statusLabel(acc.status);
                      return (
                        <tr
                          key={acc.token}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-sm font-mono">{maskToken(acc.token)}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${tierClass(tier)}`}>
                              {tier}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`text-sm ${statusClass(st)}`}>{st}</span>
                          </td>
                          <td className="py-2.5 px-4 text-sm text-muted-foreground">
                            {formatSynced(acc.last_used_at)}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => void handleRefreshRow(acc.token)}
                                disabled={refreshingToken === acc.token}
                                className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                                title="Refresh quota"
                              >
                                <RefreshCw
                                  className={`w-3.5 h-3.5 ${refreshingToken === acc.token ? "animate-spin" : ""}`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDeleteModal(acc.token)}
                                className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradio-panel p-5 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-semibold">Remove Account</h3>
            <p className="text-sm text-muted-foreground">
              This will remove the account from the pool. Continue?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(showDeleteModal)}
                className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

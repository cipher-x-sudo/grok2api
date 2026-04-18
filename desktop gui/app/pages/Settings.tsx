import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Settings as SettingsIcon,
  CheckCircle2,
  Server,
  Key,
  Shield,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch, openAiFetch } from "@/lib/http";
import { loadSettings, saveSettings } from "@/lib/settings";

export function Settings() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000");
  const [apiKey, setApiKey] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingUser, setTestingUser] = useState(false);
  const [testingAdmin, setTestingAdmin] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setBaseUrl(s.baseUrl);
    setApiKey(s.apiKey);
    setAdminKey(s.adminKey);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      saveSettings({ baseUrl, apiKey, adminKey });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Settings saved");
    } finally {
      setIsSaving(false);
    }
  };

  const testUserApi = async () => {
    saveSettings({ baseUrl, apiKey });
    if (!apiKey.trim()) {
      toast.error("Enter an API access key first");
      return;
    }
    setTestingUser(true);
    try {
      const res = await openAiFetch("/v1/models", { method: "GET" });
      const j = (await res.json()) as { data?: unknown[] };
      const n = Array.isArray(j.data) ? j.data.length : 0;
      toast.success(`User API OK (${n} models)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "User API test failed");
    } finally {
      setTestingUser(false);
    }
  };

  const testAdminApi = async () => {
    saveSettings({ baseUrl, adminKey });
    if (!adminKey.trim()) {
      toast.error("Enter an admin key first");
      return;
    }
    setTestingAdmin(true);
    try {
      await adminFetch("/admin/api/verify", { method: "GET" });
      toast.success("Admin API OK");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Admin API test failed");
    } finally {
      setTestingAdmin(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-card/50">
        <SettingsIcon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">API Setup</span>
        {saved && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Connection Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure your Grok2API backend endpoint and authentication. Values are stored locally on this device.
            </p>
          </div>

          <div className="gradio-panel p-5 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                <Server className="w-3.5 h-3.5" />
                Backend Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full gradio-input px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                <Key className="w-3.5 h-3.5" />
                API Access Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full gradio-input px-3 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void testUserApi()}
                disabled={testingUser}
                className="mt-2 w-full py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-2"
              >
                {testingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                Test user API (GET /v1/models)
              </button>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                <Shield className="w-3.5 h-3.5" />
                Admin API Key
              </label>
              <div className="relative">
                <input
                  type={showAdminKey ? "text" : "password"}
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Admin key from server config"
                  className="w-full gradio-input px-3 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Required for Admin and Local Cache tabs (<code className="text-primary">/admin/api/*</code>).
              </p>
              <button
                type="button"
                onClick={() => void testAdminApi()}
                disabled={testingAdmin}
                className="mt-2 w-full py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-2"
              >
                {testingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                Test admin API (GET /admin/api/verify)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="gradio-button w-full flex items-center justify-center gap-2 text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </button>

          <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              The backend should expose OpenAI-compatible endpoints at{" "}
              <code className="text-primary">/v1/chat/completions</code> and related{" "}
              <code className="text-primary">/v1/*</code> routes. Admin routes use{" "}
              <code className="text-primary">/admin/api/*</code> with the admin key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

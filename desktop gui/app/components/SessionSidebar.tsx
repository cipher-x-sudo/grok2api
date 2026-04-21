import { useState, useEffect, useRef } from "react";
import { MessageSquare, Image as ImageIcon, Video, Plus, Trash2, Loader2, Edit2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export interface Session {
  id: number;
  type: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SessionSidebarProps {
  type: "chat" | "image" | "video";
  activeSessionId: number | null;
  onSelectSession: (id: number | null) => void;
  onSessionsLoaded?: (sessions: Session[]) => void;
}

export function SessionSidebar({ type, activeSessionId, onSelectSession, onSessionsLoaded }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/sessions?type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
      onSessionsLoaded?.(data);
    } catch (err) {
      toast.error("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [type]);

  useEffect(() => {
    const handleReload = () => fetchSessions();
    window.addEventListener("reload-sessions", handleReload);
    return () => window.removeEventListener("reload-sessions", handleReload);
  }, [type]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleNewSession = async () => {
    const date = new Date();
    const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    
    let typeName = "Chat";
    if (type === "image") typeName = "Image";
    if (type === "video") typeName = "Video";

    const defaultTitle = `${typeName} · ${formattedDate}, ${formattedTime}`;

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: defaultTitle }),
      });
      if (res.ok) {
        const newSession = await res.json();
        onSelectSession(newSession.id);
        fetchSessions();
      }
    } catch (err) {
      toast.error("Failed to create session");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      if (activeSessionId === id) {
        onSelectSession(null);
      }
      fetchSessions();
    } catch (err) {
      toast.error("Failed to delete session");
    }
  };

  const startEditing = (e: React.MouseEvent, s: Session) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const saveEdit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!editingId) return;
    
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename session");
      
      setSessions((prev) => prev.map((s) => (s.id === editingId ? { ...s, title: editTitle.trim() } : s)));
    } catch (err) {
      toast.error("Failed to rename session");
    } finally {
      setEditingId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const getIcon = () => {
    if (type === "chat") return <MessageSquare className="w-4 h-4" />;
    if (type === "image") return <ImageIcon className="w-4 h-4" />;
    return <Video className="w-4 h-4" />;
  };

  return (
    <div className="w-64 border-r border-border bg-card/30 flex flex-col h-full shrink-0">
      <div className="h-14 border-b border-border flex items-center px-4 shrink-0">
        <button
          onClick={handleNewSession}
          className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary transition-colors h-9 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New {type === "chat" ? "Chat" : type === "image" ? "Image" : "Video"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No sessions yet
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => {
                  if (editingId !== s.id) onSelectSession(s.id);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                  editingId === s.id ? "bg-card border border-border cursor-default" :
                  activeSessionId === s.id
                    ? "bg-primary/15 text-primary cursor-pointer"
                    : "hover:bg-muted/50 text-foreground cursor-pointer"
                }`}
              >
                {editingId === s.id ? (
                  <form onSubmit={saveEdit} className="flex flex-1 items-center gap-1.5 min-w-0">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveEdit()}
                      className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm px-1 min-w-0"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); cancelEdit(e); }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="submit"
                      onMouseDown={(e) => e.preventDefault()}
                      className="p-1 hover:bg-primary/20 rounded text-primary transition-colors shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`shrink-0 ${activeSessionId === s.id ? "text-primary" : "text-muted-foreground"}`}>
                        {getIcon()}
                      </div>
                      <span className="text-sm truncate pr-2 font-medium">
                        {s.title}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => startEditing(e, s)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, s.id)}
                        className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

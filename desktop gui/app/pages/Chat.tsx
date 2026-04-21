import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Paperclip,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Sparkles,
  Brain,
  Bot,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { loadSettings } from "@/lib/settings";
import { iterateChatCompletionStream } from "@/lib/chatStream";
import { openAiJson } from "@/lib/http";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SessionSidebar } from "@/components/SessionSidebar";

interface Message {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  image?: string;
}

const FALLBACK_MODELS = [
  { value: "grok-4.20-0309", label: "Grok 4.20", badge: "Chat" },
  { value: "grok-4.20-0309-reasoning", label: "Grok 4.20 Reasoning", badge: "Reason" },
  { value: "grok-4.20-multi-agent", label: "Grok 4.20 Multi-Agent", badge: "Agent" },
];

function userContentForApi(text: string, image?: string): string | object[] {
  if (!image) return text;
  return [
    { type: "text", text: text || "Describe this image." },
    { type: "image_url", image_url: { url: image } },
  ];
}

export function Chat() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [modelOptions, setModelOptions] = useState(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0]!.value);
  const [showReasoning, setShowReasoning] = useState(true);
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { apiKey } = loadSettings();
      if (!apiKey) return;
      try {
        const data = await openAiJson<{
          data?: { id: string; name?: string }[];
        }>("/v1/models", { method: "GET" });
        const items = (data.data ?? []).filter((m) => m.id);
        if (!alive || items.length === 0) return;
        setModelOptions(
          items.slice(0, 64).map((m) => ({
            value: m.id,
            label: (m.name && m.name.trim()) || m.id,
            badge: "Model",
          })),
        );
        const ids = items.map((m) => m.id);
        setSelectedModel((prev) => (ids.includes(prev) ? prev : ids[0]!));
      } catch {
        // fallback
      }
    })();
    return () => { alive = false; };
  }, []);

  const loadMessages = async (sessionId: number) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content || "",
          thinking: m.thinking || undefined,
          image: m.image_url || undefined,
        })));
      }
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const buildHistoryMessages = useCallback(
    (history: Message[], userMsg: Message) => {
      const out: { role: string; content: string | object[] }[] = [];
      for (const m of history) {
        if (m.role === "user") {
          out.push({ role: "user", content: userContentForApi(m.content, m.image) });
        } else {
          out.push({ role: "assistant", content: m.content });
        }
      }
      out.push({ role: "user", content: userContentForApi(userMsg.content, userMsg.image) });
      return out;
    },
    [],
  );

  const saveMessageToDb = async (sessionId: number, msg: any) => {
    try {
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: msg.role,
          content: msg.content,
          thinking: msg.thinking || null,
          image_url: msg.image || null,
        }),
      });
      window.dispatchEvent(new Event("reload-sessions"));
    } catch (err) {
      console.error("Failed to save message", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !uploadedImage) return;
    const { apiKey } = loadSettings();
    if (!apiKey) {
      toast.error("Configure API access key in API Setup");
      return;
    }

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      // Create session
      const title = input.trim().slice(0, 30) || "New Chat";
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "chat", title }),
        });
        if (res.ok) {
          const newSession = await res.json();
          currentSessionId = newSession.id;
          setActiveSessionId(currentSessionId);
          window.dispatchEvent(new Event("reload-sessions"));
        }
      } catch (err) {
        toast.error("Failed to create session");
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || "Analyze this image",
      image: uploadedImage || undefined,
    };
    
    if (currentSessionId) {
      saveMessageToDb(currentSessionId, userMessage);
    }

    const history = messages;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedImage(null);

    const assistantId = `${Date.now()}-a`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setIsGenerating(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const apiMessages = buildHistoryMessages(history, userMessage);
      let acc = "";
      let think = "";
      for await (const chunk of iterateChatCompletionStream(
        {
          model: selectedModel,
          messages: apiMessages,
          stream: true,
          thinking: showReasoning,
        },
        signal,
      )) {
        if (chunk.contentDelta) acc += chunk.contentDelta;
        if (chunk.reasoningDelta) think += chunk.reasoningDelta;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: acc,
                  thinking: think || undefined,
                }
              : m,
          ),
        );
      }
      
      const finalMsg = { role: "assistant" as const, content: acc || "(empty response)", thinking: think || undefined };
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...finalMsg } : m)));
      
      if (currentSessionId) {
        saveMessageToDb(currentSessionId, finalMsg);
      }
      
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || "(stopped)" } : m)));
      } else {
        const msg = e instanceof Error ? e.message : "Request failed";
        toast.error(msg);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${msg}` } : m)));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => abortRef.current?.abort();

  return (
    <div className="h-full w-full flex overflow-hidden">
      <SessionSidebar 
        type="chat" 
        activeSessionId={activeSessionId} 
        onSelectSession={setActiveSessionId} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-border flex items-center justify-between shrink-0 bg-card/50 px-3 sm:px-5">
          <div className="flex items-center gap-2 shrink-0">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium whitespace-nowrap">Chat & Reason</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
            {isLoadingMessages ? (
               <div className="flex justify-center py-10">
                 <Loader2 className="w-6 h-6 animate-spin text-primary" />
               </div>
            ) : messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Start a conversation</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Choose a model above and type a message. Attach images for vision analysis.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                    msg.role === "user" ? "bg-primary/15" : "bg-muted"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {msg.role === "assistant" && msg.thinking && showReasoning && (
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={() => setShowThinking((p) => ({ ...p, [msg.id]: !p[msg.id] }))}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
                      >
                        <Brain className="w-3 h-3 text-primary" />
                        <span>Thought process</span>
                        {showThinking[msg.id] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                      <AnimatePresence>
                        {showThinking[msg.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground italic leading-relaxed mb-2 whitespace-pre-wrap">
                              {msg.thinking}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Uploaded"
                      className="max-w-[240px] rounded-lg mb-2 border border-border"
                    />
                  )}
                  {msg.role === "assistant" && !msg.content && isGenerating ? null : msg.role === "user" ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Generating...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-card/50 px-5 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="gradio-panel p-2 flex items-center gap-2 transition-all focus-within:ring-1 focus-within:ring-border">
              {/* Left: Model Selector & Attachment */}
              <div className="flex items-center gap-1 shrink-0">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[130px] sm:w-[170px] h-9 text-sm font-medium bg-transparent border-0 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 shadow-none transition-colors px-2">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[200px]">
                    <SelectGroup>
                      <SelectLabel>Text Models</SelectLabel>
                      {modelOptions.filter(m => !m.value.toLowerCase().includes('image') && !m.value.toLowerCase().includes('video')).map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs [&>span]:truncate [&>span]:block">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Image Models</SelectLabel>
                      {modelOptions.filter(m => m.value.toLowerCase().includes('image')).map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs [&>span]:truncate [&>span]:block">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Video Models</SelectLabel>
                      {modelOptions.filter(m => m.value.toLowerCase().includes('video')).map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs [&>span]:truncate [&>span]:block">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <label className="p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer shrink-0 text-muted-foreground hover:text-foreground">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {/* Middle: Input & Image Preview */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                {uploadedImage && (
                  <div className="mb-2 relative inline-block self-start mt-2">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-border shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full bg-transparent resize-none min-h-[20px] max-h-[120px] focus:outline-none text-sm placeholder:text-muted-foreground/70 self-center leading-relaxed"
                  rows={1}
                />
              </div>

              {/* Right: Thinking Toggle & Send */}
              <div className="flex items-center gap-2 shrink-0 pr-1">
                <button
                  type="button"
                  onClick={() => setShowReasoning(!showReasoning)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    showReasoning
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground bg-transparent"
                  }`}
                  title="Toggle Thinking/Reasoning"
                >
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Thinking</span>
                </button>

                {isGenerating ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-4 py-2 flex items-center gap-2 text-sm shrink-0 bg-muted text-foreground rounded-xl font-medium transition-colors"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!input.trim() && !uploadedImage}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 py-2 flex items-center gap-2 text-sm shrink-0 rounded-xl font-medium transition-transform active:scale-95 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

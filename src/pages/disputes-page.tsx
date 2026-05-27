import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDisputes,
  resolveDispute,
  fetchDisputeMessages,
  sendDisputeMessage,
} from "@/lib/admin-api";
import type { Dispute, DisputeMessage } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  X,
} from "lucide-react";

type StatusFilter = "all" | "open" | "resolved";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Dispute | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDisputes(
        filter === "all" ? undefined : filter,
      );
      setDisputes(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = disputes;

  const openCount = disputes.filter((d) => d.status === "open").length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disputas y Reclamos</h1>
          <p className="text-sm text-on-surface-variant">
            {openCount} abiertos · {resolvedCount} resueltos
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "open", "resolved"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === s
                  ? "bg-primary text-white"
                  : "bg-white/5 text-on-surface-variant hover:bg-white/10"
              }`}
            >
              {s === "all" ? "Todos" : s === "open" ? "Abiertos" : "Resueltos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-on-surface-variant">
          No hay disputas{filter !== "all" ? ` con estado "${filter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className={`w-full rounded-xl border p-4 text-left transition hover:bg-white/5 ${
                d.status === "open"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {d.status === "open" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  )}
                  <div>
                    <p className="font-semibold">{d.reason}</p>
                    <p className="text-xs text-on-surface-variant">
                      Solicitud: {d.requestTitle} · {d.reporterName} (
                      {d.reporterType})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <Clock className="h-3 w-3" />
                  {new Date(d.createdAt).toLocaleDateString("es-BO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {d.description && (
                <p className="mt-2 text-sm text-on-surface-variant line-clamp-2">
                  {d.description}
                </p>
              )}
              {d.resolution && (
                <p className="mt-2 rounded-lg bg-green-500/10 p-2 text-sm text-green-300">
                  <span className="font-semibold">Resolución:</span>{" "}
                  {d.resolution}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <DisputeChat
          dispute={selected}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DisputeChat({
  dispute,
  onClose,
}: {
  dispute: Dispute;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolveText, setResolveText] = useState("");
  const [resolving, setResolving] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchDisputeMessages(dispute.id);
      setMessages(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [dispute.id]);

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(intervalRef.current);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await sendDisputeMessage(dispute.id, msg);
      await loadMessages();
    } catch {
      /* ignore */
    }
    setSending(false);
  };

  const handleResolve = async () => {
    if (!resolveText.trim() || resolving) return;
    setResolving(true);
    try {
      await resolveDispute(dispute.id, resolveText.trim());
      onClose();
    } catch {
      /* ignore */
    }
    setResolving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0d1117]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Chat de Soporte</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  dispute.status === "open"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-green-500/20 text-green-300"
                }`}
              >
                {dispute.status === "open" ? "Abierto" : "Resuelto"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              {dispute.reason} · {dispute.reporterName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
              No hay mensajes aún.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const isAdmin = m.senderType === "admin";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        isAdmin
                          ? "rounded-br-sm bg-primary/20"
                          : "rounded-bl-sm bg-white/10"
                      }`}
                    >
                      {!isAdmin && (
                        <p className="mb-1 text-xs font-semibold text-primary">
                          {m.senderName}
                        </p>
                      )}
                      {isAdmin && (
                        <p className="mb-1 text-xs font-semibold text-green-400">
                          Admin
                        </p>
                      )}
                      <p className="text-sm">{m.content}</p>
                      <p className="mt-1 text-right text-[10px] text-on-surface-variant">
                        {new Date(m.createdAt).toLocaleTimeString("es-BO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Resolve bar */}
        {dispute.status === "open" && (
          <div className="border-t border-white/10 px-6 py-2">
            {showResolve ? (
              <div className="flex gap-2">
                <input
                  value={resolveText}
                  onChange={(e) => setResolveText(e.target.value)}
                  placeholder="Escribe la resolución..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-green-400"
                />
                <button
                  onClick={handleResolve}
                  disabled={resolving || !resolveText.trim()}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {resolving ? "..." : "Resolver"}
                </button>
                <button
                  onClick={() => setShowResolve(false)}
                  className="rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResolve(true)}
                className="w-full rounded-lg border border-green-500/30 bg-green-500/10 py-2 text-sm font-medium text-green-400 hover:bg-green-500/20"
              >
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Marcar como resuelto
              </button>
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-white/10 px-6 py-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Responder al usuario..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-white hover:bg-primary/80 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

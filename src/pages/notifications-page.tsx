import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, ChevronDown, FlaskConical, Megaphone, Search, Send, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/modal";
import { broadcastNotification, fetchPushUsers, simulateJobRequestNotification } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type PushUser = { id: string; firstName: string; lastName: string; type: string; lastSeenAt: string };
type Target = "workers" | "clients" | "all" | "custom";

const TITLE_MAX = 80;
const BODY_MAX = 500;

const AUDIENCES: { value: Target; label: string; hint: string }[] = [
  { value: "workers", label: "Trabajadores", hint: "Todos los trabajadores registrados" },
  { value: "clients", label: "Clientes", hint: "Todos los clientes registrados" },
  { value: "all", label: "Todos", hint: "Trabajadores y clientes" },
  { value: "custom", label: "Personalizado", hint: "Elige usuarios de la lista" },
];

const TEMPLATES: { label: string; title: string; body: string }[] = [
  {
    label: "Nuevos empleos",
    title: "¡Hay nuevos empleos en Chamba! 💼",
    body: "Llegaron nuevas solicitudes de trabajo. Ponte disponible y revisa las que están cerca de ti.",
  },
  {
    label: "Mantente disponible",
    title: "Hoy hay mucha demanda 🔥",
    body: "Muchos clientes están buscando ayuda. Activa tu disponibilidad para recibir más solicitudes.",
  },
  {
    label: "Completa tu perfil",
    title: "Completa tu perfil y gana más",
    body: "Los perfiles con foto, habilidades y portafolio reciben más ofertas. Actualízalo en Perfil.",
  },
  {
    label: "Mantenimiento",
    title: "Mantenimiento programado",
    body: "La app estará en mantenimiento esta noche de 23:00 a 23:30. Gracias por tu paciencia.",
  },
];

function audienceText(target: Target, selected: number) {
  if (target === "custom") return `${selected} usuario${selected === 1 ? "" : "s"} seleccionado${selected === 1 ? "" : "s"}`;
  return AUDIENCES.find((a) => a.value === target)!.hint.toLowerCase();
}

export default function NotificationsPage() {
  const [target, setTarget] = useState<Target>("workers");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Audiencia personalizada
  const [pushUsers, setPushUsers] = useState<PushUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (target !== "custom" || usersLoaded) return;
    fetchPushUsers()
      .then((users) => {
        setPushUsers(users);
        setUsersLoaded(true);
      })
      .catch(() => toast.error("No se pudo cargar la lista de usuarios."));
  }, [target, usersLoaded]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pushUsers.filter((u) => `${u.firstName} ${u.lastName || ""} ${u.type}`.toLowerCase().includes(term));
  }, [pushUsers, search]);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSend =
    trimmedTitle.length > 0 &&
    trimmedBody.length > 0 &&
    title.length <= TITLE_MAX &&
    body.length <= BODY_MAX &&
    (target !== "custom" || selectedUserIds.size > 0);

  const requestSend = () => {
    if (!trimmedTitle || !trimmedBody) return toast.error("Escribe un título y un mensaje.");
    if (target === "custom" && selectedUserIds.size === 0) return toast.error("Selecciona al menos un usuario.");
    setConfirmOpen(true);
  };

  const send = async () => {
    setSending(true);
    try {
      const res = await broadcastNotification({
        target,
        type: "announcement",
        title: trimmedTitle,
        body: trimmedBody,
        userIds: target === "custom" ? Array.from(selectedUserIds) : undefined,
      });
      toast.success(
        `Aviso enviado: ${res.saved ?? 0} usuario(s) lo verán en Notificaciones · ${res.count ?? 0} push entregado(s).`,
      );
      setTitle("");
      setBody("");
      setSelectedUserIds(new Set());
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "No se pudo enviar el aviso.");
    } finally {
      setSending(false);
    }
  };

  const toggleUser = (id: string) => {
    const next = new Set(selectedUserIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedUserIds(next);
  };

  const toggleAll = () => {
    const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id));
    setSelectedUserIds(allSelected ? new Set() : new Set(filteredUsers.map((u) => u.id)));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Redactar aviso ─────────────────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-container/15 text-primary">
              <Megaphone size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Enviar aviso</h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Avisos especiales —como nuevos empleos o promociones—. Llegan como notificación push y quedan
                guardados en la pestaña <b>Notificaciones</b> de la app, aunque el usuario tenga el push desactivado.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">¿A quién se lo envías?</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setTarget(a.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                      target === a.value
                        ? "border-transparent bg-primary-container text-white shadow-lg shadow-primary-container/25"
                        : "border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-[var(--border-medium)]",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Users size={14} /> Se enviará a {audienceText(target, selectedUserIds.size)}.
              </p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles size={15} className="text-primary" /> Plantillas rápidas
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      setTitle(t.title);
                      setBody(t.body);
                    }}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="ann-title" className="text-sm font-semibold">Título</label>
                <span className={cn("text-xs", title.length > TITLE_MAX ? "text-error" : "text-on-surface-variant")}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: ¡Hay nuevos empleos en Chamba!"
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="ann-body" className="text-sm font-semibold">Mensaje</label>
                <span className={cn("text-xs", body.length > BODY_MAX ? "text-error" : "text-on-surface-variant")}>
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <textarea
                id="ann-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Ej: Llegaron nuevas solicitudes en tu zona. Ponte disponible para recibirlas."
                className="glass-input w-full resize-y px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              onClick={requestSend}
              disabled={!canSend || sending}
              className="flex w-full items-center justify-center gap-2 bg-primary-container py-3 text-base font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
              {target === "custom"
                ? `Enviar a ${selectedUserIds.size} usuario${selectedUserIds.size === 1 ? "" : "s"}`
                : `Enviar a ${AUDIENCES.find((a) => a.value === target)!.label.toLowerCase()}`}
            </Button>
          </div>
        </section>

        {/* ── Vista previa ───────────────────────────────────────────── */}
        <aside className="glass-panel h-fit rounded-2xl p-6 xl:sticky xl:top-6">
          <h2 className="mb-1 text-sm font-semibold">Vista previa</h2>
          <p className="mb-5 text-xs text-on-surface-variant">Así se verá en el teléfono.</p>

          <div className="mx-auto max-w-[300px] rounded-[2rem] border border-[var(--border-medium)] bg-[#f7f6fc] p-3 pb-6 shadow-xl">
            <div className="mb-3 flex justify-center">
              <div className="h-1.5 w-16 rounded-full bg-black/10" />
            </div>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b6584]">Push</p>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <img src="/favicon.png" alt="" className="h-4 w-4 rounded" onError={(e) => (e.currentTarget.style.display = "none")} />
                <span className="text-[11px] font-medium text-[#6b6584]">Chamba · ahora</span>
              </div>
              <p className="line-clamp-2 text-[13px] font-semibold text-[#17132d]">{trimmedTitle || "Título del aviso"}</p>
              <p className="line-clamp-3 text-[12px] text-[#6b6584]">{trimmedBody || "Aquí aparecerá tu mensaje."}</p>
            </div>

            <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b6584]">
              Pestaña Notificaciones
            </p>
            <div className="flex gap-3 rounded-2xl border border-[#e9e5f3] bg-white p-3">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/10 text-[#7c3aed]">
                <Megaphone size={20} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#7c3aed]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#17132d]">{trimmedTitle || "Título del aviso"}</p>
                <p className="whitespace-pre-line text-[12px] leading-snug text-[#6b6584]">
                  {trimmedBody || "Aquí aparecerá tu mensaje."}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-[#6b6584]">Hace un momento</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {target === "custom" && (
        <UserPicker
          users={filteredUsers}
          loaded={usersLoaded}
          search={search}
          onSearch={setSearch}
          selected={selectedUserIds}
          onToggle={toggleUser}
          onToggleAll={toggleAll}
        />
      )}

      <TestingTools target={target} selectedUserIds={selectedUserIds} />

      <Modal open={confirmOpen} onOpenChange={(open) => !sending && setConfirmOpen(open)}>
        <ModalContent>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container/15 text-primary">
            <Bell size={22} />
          </div>
          <h3 className="text-lg font-bold">¿Enviar este aviso?</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Se enviará a {audienceText(target, selectedUserIds.size)}. No se puede deshacer.
          </p>
          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3">
            <p className="text-sm font-semibold">{trimmedTitle}</p>
            <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-sm text-on-surface-variant">{trimmedBody}</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
              className="border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)]"
            >
              Cancelar
            </Button>
            <Button
              onClick={send}
              disabled={sending}
              className="flex items-center gap-2 bg-primary-container font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              <Send size={16} /> {sending ? "Enviando..." : "Sí, enviar"}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

function UserPicker(props: {
  users: PushUser[];
  loaded: boolean;
  search: string;
  onSearch: (value: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const { users, loaded, search, onSearch, selected, onToggle, onToggleAll } = props;
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  return (
    <section className="glass-panel flex max-h-[560px] flex-col rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Seleccionar usuarios</h2>
        <span className="text-sm text-on-surface-variant">{selected.size} seleccionados</span>
      </div>
      <div className="glass-input mb-4 flex items-center gap-2 rounded-full px-3 py-1.5">
        <Search size={16} className="text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nombre o rol..."
          className="w-full border-none bg-transparent p-0 text-sm focus:ring-0"
        />
      </div>
      <p className="mb-3 text-xs text-on-surface-variant">
        Solo aparecen usuarios con la app instalada y notificaciones registradas (máx. 500, los más recientes).
      </p>
      <div className="flex-1 overflow-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--bg-card)] text-on-surface-variant">
            <tr>
              <th className="p-3">
                <input type="checkbox" className="accent-primary" checked={allSelected} onChange={onToggleAll} />
              </th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Última conexión</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => onToggle(u.id)}
                className="cursor-pointer border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-card-hover)]"
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selected.has(u.id)}
                    onChange={() => onToggle(u.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="p-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="p-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-bold",
                      u.type === "worker" ? "bg-blue-500/15 text-blue-500" : "bg-purple-500/15 text-purple-500",
                    )}
                  >
                    {u.type === "worker" ? "Trabajador" : "Cliente"}
                  </span>
                </td>
                <td className="p-3 text-on-surface-variant">
                  {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString("es-BO") : "—"}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                  {loaded ? "No se encontraron usuarios." : "Cargando usuarios..."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Herramientas técnicas que ya existían: push sin guardar en la bandeja, toast
 * por socket, alerta de llamada y simulación de solicitud nueva. Usan la misma
 * audiencia elegida arriba.
 */
function TestingTools({ target, selectedUserIds }: { target: Target; selectedUserIds: Set<string> }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"push" | "toast">("push");
  const [isCallAlert, setIsCallAlert] = useState(false);
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return toast.error("El título y el cuerpo son obligatorios.");
    if (target === "custom" && selectedUserIds.size === 0) return toast.error("Selecciona al menos un usuario.");
    setLoading(true);
    try {
      await broadcastNotification({
        target,
        type,
        title,
        body,
        toastType: type === "toast" ? toastType : undefined,
        userIds: target === "custom" ? Array.from(selectedUserIds) : undefined,
        isCallAlert: type === "push" ? isCallAlert : undefined,
      });
      toast.success("Prueba enviada.");
    } catch (err: any) {
      toast.error(err.message || "Error al enviar la prueba.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (target === "custom" && selectedUserIds.size === 0) return toast.error("Selecciona al menos un usuario.");
    setSimulating(true);
    try {
      const res = await simulateJobRequestNotification({
        target: target === "custom" ? "custom" : "workers",
        userIds: target === "custom" ? Array.from(selectedUserIds) : undefined,
      });
      toast.success(`Alerta de solicitud enviada a ${res.count} dispositivo(s).`);
    } catch (err: any) {
      toast.error(err.message || "Error al enviar la alerta.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 p-6 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <FlaskConical size={20} className="text-on-surface-variant" />
          <span>
            <span className="block font-semibold">Herramientas de prueba</span>
            <span className="block text-xs text-on-surface-variant">
              Push sin guardar, toast por socket, alerta de llamada y simulación de solicitud. Usan la audiencia de arriba.
            </span>
          </span>
        </span>
        <ChevronDown size={20} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="grid gap-8 border-t border-[var(--border-subtle)] p-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={type === "push"} onChange={() => setType("push")} className="accent-primary" />
                Push (FCM, no queda en la bandeja)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={type === "toast"} onChange={() => setType("toast")} className="accent-primary" />
                Toast en tiempo real
              </label>
            </div>
            {type === "push" ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isCallAlert} onChange={(e) => setIsCallAlert(e.target.checked)} className="accent-primary" />
                Alerta de llamada (despierta la app, data-only)
              </label>
            ) : (
              <div className="flex gap-4 text-sm">
                {(["info", "success", "error"] as const).map((tt) => (
                  <label key={tt} className="flex items-center gap-2 capitalize">
                    <input type="radio" checked={toastType === tt} onChange={() => setToastType(tt)} className="accent-primary" />
                    {tt}
                  </label>
                ))}
              </div>
            )}
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full" />
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Cuerpo" className="w-full" />
            <Button
              onClick={handleSend}
              disabled={loading}
              className="w-full border border-[var(--border-medium)] font-medium hover:bg-[var(--bg-card-hover)]"
            >
              {loading ? "Enviando..." : "Enviar prueba"}
            </Button>
          </div>

          <div>
            <h3 className="font-semibold">Simular solicitud nueva</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Envía la alerta de trabajo nuevo tal como le llega a un trabajador (mismo <code>type</code>, <code>jobId</code> y{" "}
              <code>deep_link</code>), sin crear una solicitud real.
            </p>
            <p className="mt-2 text-xs text-on-surface-variant">
              {target === "custom"
                ? `Se enviará a los ${selectedUserIds.size} usuario(s) seleccionados.`
                : "Se enviará a todos los trabajadores con push registrado."}
            </p>
            <Button
              onClick={handleSimulate}
              disabled={simulating}
              className="mt-4 w-full border border-[var(--border-medium)] font-medium hover:bg-[var(--bg-card-hover)]"
            >
              {simulating ? "Enviando..." : "Enviar alerta de solicitud nueva"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { broadcastNotification, fetchPushUsers } from "@/lib/admin-api";
import { Search } from "lucide-react";

type PushUser = { id: string; firstName: string; lastName: string; type: string; lastSeenAt: string };

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"all" | "workers" | "clients" | "custom">("all");
  const [type, setType] = useState<"push" | "toast">("push");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");

  // Custom audience state
  const [pushUsers, setPushUsers] = useState<PushUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (target === "custom" && pushUsers.length === 0) {
      loadPushUsers();
    }
  }, [target]);

  const loadPushUsers = async () => {
    try {
      const users = await fetchPushUsers();
      setPushUsers(users);
    } catch (err: any) {
      toast.error("Error al cargar lista de usuarios");
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("El título y el cuerpo son obligatorios.");
      return;
    }

    if (target === "custom" && selectedUserIds.size === 0) {
      toast.error("Selecciona al menos un usuario.");
      return;
    }

    setLoading(true);
    try {
      await broadcastNotification({
        target,
        type,
        title,
        body,
        toastType: type === "toast" ? toastType : undefined,
        userIds: target === "custom" ? Array.from(selectedUserIds) : undefined,
      });
      toast.success("Notificación enviada correctamente.");
      setTitle("");
      setBody("");
      setSelectedUserIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Error al enviar la notificación.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = pushUsers.filter(u => {
    const term = search.toLowerCase();
    const name = `${u.firstName} ${u.lastName || ""}`.toLowerCase();
    return name.includes(term) || u.type.includes(term);
  });

  const handleToggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleToggleUser = (id: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUserIds(newSet);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="glass-panel w-full max-w-2xl flex-shrink-0 rounded-2xl p-6 h-fit">
        <h1 className="mb-4 text-3xl font-bold">Enviar Notificaciones</h1>
        <p className="mb-6 text-on-surface-variant">
          Envía notificaciones push o toast (en tiempo real) a los usuarios de la aplicación.
        </p>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">Audiencia (Target)</label>
            <div className="flex flex-wrap gap-4">
              {["all", "workers", "clients", "custom"].map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="target"
                    value={t}
                    checked={target === t}
                    onChange={(e) => setTarget(e.target.value as any)}
                    className="accent-primary"
                  />
                  <span className="capitalize">{t === "all" ? "Todos" : t === "custom" ? "Personalizado" : t}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Tipo de Notificación</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="push"
                  checked={type === "push"}
                  onChange={(e) => setType(e.target.value as any)}
                  className="accent-primary"
                />
                <span>Push Notification (FCM)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="toast"
                  checked={type === "toast"}
                  onChange={(e) => setType(e.target.value as any)}
                  className="accent-primary"
                />
                <span>Toast en tiempo real (Sockets)</span>
              </label>
            </div>
          </div>

          {type === "toast" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Estilo del Toast</label>
              <div className="flex gap-4">
                {["info", "success", "error"].map((tt) => (
                  <label key={tt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="toastType"
                      value={tt}
                      checked={toastType === tt}
                      onChange={(e) => setToastType(e.target.value as any)}
                      className="accent-primary"
                    />
                    <span className="capitalize">{tt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Nueva actualización..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {type === "toast" ? "Texto de Acción" : "Cuerpo del mensaje"}
            </label>
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={type === "toast" ? "Ej: Update Payment Details" : "Ej: Hemos añadido nuevas funciones..."}
            />
          </div>

          <Button
            className="bg-primary-container text-white w-full"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? "Enviando..." : target === "custom" ? `Enviar a ${selectedUserIds.size} usuarios` : "Enviar Notificación"}
          </Button>
        </div>
      </section>

      {target === "custom" && (
        <section className="glass-panel w-full flex-1 rounded-2xl p-6 h-[800px] flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Seleccionar Usuarios</h2>
            <span className="text-sm text-on-surface-variant">{selectedUserIds.size} seleccionados</span>
          </div>
          
          <div className="mb-4 flex items-center gap-2 glass-input px-3 py-1.5 rounded-full">
            <Search size={16} className="text-on-surface-variant" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar por nombre o rol..."
              className="border-none bg-transparent p-0 text-sm w-full"
            />
          </div>

          <div className="flex-1 overflow-auto rounded-lg border border-white/10 bg-surface/30">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface/80 backdrop-blur text-on-surface-variant">
                <tr>
                  <th className="p-3">
                    <input 
                      type="checkbox" 
                      className="accent-primary"
                      checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Última Conexión</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <input 
                        type="checkbox" 
                        className="accent-primary"
                        checked={selectedUserIds.has(u.id)}
                        onChange={() => handleToggleUser(u.id)}
                      />
                    </td>
                    <td className="p-3 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.type === "worker" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {u.type}
                      </span>
                    </td>
                    <td className="p-3 text-on-surface-variant">
                      {new Date(u.lastSeenAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                      No se encontraron usuarios activos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

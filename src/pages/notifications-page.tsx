import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { broadcastNotification } from "@/lib/admin-api";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"all" | "workers" | "clients">("all");
  const [type, setType] = useState<"push" | "toast">("push");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("El título y el cuerpo son obligatorios.");
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
      });
      toast.success("Notificación enviada correctamente.");
      setTitle("");
      setBody("");
    } catch (err: any) {
      toast.error(err.message || "Error al enviar la notificación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel max-w-2xl rounded-2xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Enviar Notificaciones</h1>
      <p className="mb-6 text-on-surface-variant">
        Envía notificaciones push o toast (en tiempo real) a los usuarios de la aplicación.
      </p>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Audiencia (Target)</label>
          <div className="flex gap-4">
            {["all", "workers", "clients"].map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="target"
                  value={t}
                  checked={target === t}
                  onChange={(e) => setTarget(e.target.value as any)}
                  className="accent-primary"
                />
                <span className="capitalize">{t === "all" ? "Todos" : t}</span>
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
          className="bg-primary-container text-white"
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? "Enviando..." : "Enviar Notificación"}
        </Button>
      </div>
    </section>
  );
}

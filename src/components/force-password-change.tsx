import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

/**
 * Pantalla obligatoria cuando el admin entra con la contraseña inicial
 * (admin/admin): no deja usar el panel hasta poner una propia.
 */
export function ForcePasswordChange({ onDone }: { onDone: () => void }) {
  const logout = useAuthStore((state) => state.logout);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentPassword) return setError("Escribe tu contraseña actual.");
    if (newPassword.length < 8) {
      return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Las contraseñas nuevas no coinciden.");
    }
    if (newPassword === currentPassword || newPassword.toLowerCase() === "admin") {
      return setError("Elige una contraseña distinta de la inicial.");
    }
    setSaving(true);
    try {
      await api.post("/auth/admin/change-password", { currentPassword, newPassword });
      toast.success("Contraseña cambiada");
      onDone();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(". ") : message || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-500/20";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#13101d] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-[28px] bg-white p-8 text-slate-800 shadow-2xl"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
          <KeyRound size={24} />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Crea tu contraseña</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Entraste con la contraseña inicial. Antes de usar el panel, cámbiala por una propia.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-700">
            Contraseña actual
            <input
              type={show ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Nueva contraseña
            <input
              type={show ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Al menos 8 caracteres"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Repite la nueva contraseña
            <input
              type={show ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="flex items-center gap-1.5 self-start text-xs font-semibold text-purple-700"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
            {show ? "Ocultar contraseñas" : "Ver contraseñas"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-700 py-3 text-sm font-bold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Guardar y entrar
        </button>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          <LogOut size={15} /> Salir
        </button>
      </form>
    </div>
  );
}

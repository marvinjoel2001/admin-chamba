import { useState } from "react";
import { Droplets, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Por favor, ingresa usuario y contraseña");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/admin/login", {
        username,
        password,
      });

      const { access_token, user } = response.data;
      setAuth(access_token, user);
      toast.success("¡Bienvenido!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Credenciales incorrectas"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0812] text-white">
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[#130f1e]/80 p-8 shadow-[0_0_50px_-12px_rgba(124,58,237,0.15)] backdrop-blur-[20px]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]">
            <Droplets size={32} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Chamba Admin</h1>
          <p className="mt-2 text-sm text-white/50">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Usuario
            </label>
            <div className="relative flex items-center">
              <User
                size={18}
                className="absolute left-3 text-white/40"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                placeholder="Ingresa tu usuario"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock
                size={18}
                className="absolute left-3 text-white/40"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Ingresar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

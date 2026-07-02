import { useState } from "react";
import { Lock, User, Loader2 } from "lucide-react";
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

      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_2px_rgba(255,255,255,0.1)] backdrop-blur-[24px]">
        <div className="absolute -inset-[100%] z-[-1] animate-[spin_20s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#a855f7_100%)] opacity-20"></div>
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 p-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/10 relative group">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img src="/icon.png" alt="Chamba" className="h-full w-full object-contain drop-shadow-2xl relative z-10" />
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
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 backdrop-blur-md outline-none transition-all focus:border-purple-500/70 focus:bg-white/10 focus:ring-4 focus:ring-purple-500/20"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 backdrop-blur-md outline-none transition-all focus:border-purple-500/70 focus:bg-white/10 focus:ring-4 focus:ring-purple-500/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50"
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

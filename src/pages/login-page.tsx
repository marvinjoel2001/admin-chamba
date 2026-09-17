import { useState } from "react";
import { Lock, User, Loader2, Eye, EyeOff, ShieldCheck, Headphones, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#0d121f] select-none">
      {/* Background Image with Office & Bolivian Sunset Vista */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-100 transition-transform duration-1000 ease-out"
        style={{ backgroundImage: `url('/login-bg.jpg')` }}
      />

      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

      {/* Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[36px] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_40px_rgba(255,255,255,0.4)_inset] p-8 sm:p-9 text-slate-800 transition-all">
        {/* Logo Badge */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#4c1d95] p-3 shadow-[0_12px_28px_-6px_rgba(124,58,237,0.5)] border border-white/40 ring-4 ring-white/30 transition-transform duration-300 hover:scale-105">
            <img
              src="/icon.png"
              alt="Chamba"
              className="h-full w-full object-contain drop-shadow-md rounded-xl"
            />
          </div>
          <h1 className="text-center text-[25px] font-extrabold text-slate-900 tracking-tight">
            Chamba Admin
          </h1>
          <p className="mt-1.5 text-center text-xs font-medium text-slate-500 leading-relaxed max-w-[270px]">
            Inicia sesión para continuar con tu panel de administración.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide">
              Usuario
            </label>
            <div className="relative flex items-center">
              <User
                size={18}
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-2xl border border-slate-200/90 bg-[#f1f3f9]/80 py-3 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 backdrop-blur-sm outline-none transition-all focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 tracking-wide">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock
                size={18}
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200/90 bg-[#f1f3f9]/80 py-3 pl-10 pr-11 text-sm font-medium text-slate-800 placeholder:text-slate-400 backdrop-blur-sm outline-none transition-all focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() =>
                  toast.info(
                    "Comunícate con el superadministrador para restablecer tus credenciales."
                  )
                }
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed] py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_-6px_rgba(124,58,237,0.5)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>Ingresar</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Security badge */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
            <ShieldCheck size={14} className="text-slate-400 shrink-0" />
            <span>Acceso seguro para el equipo de Chamba</span>
          </div>

          {/* Support Link */}
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <Headphones size={15} className="text-slate-400 shrink-0" />
            <span>¿Necesitas ayuda?</span>
            <a
              href="mailto:soporte@chamba.app"
              className="font-bold text-purple-600 hover:text-purple-700 hover:underline transition-colors"
            >
              Contacta soporte
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

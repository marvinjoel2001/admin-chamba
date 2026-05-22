import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SettingsPage() {
  return <section className="glass-panel max-w-2xl rounded-2xl p-6"><h1 className="mb-4 text-3xl font-bold">Configuración</h1><div className="space-y-4"><Input placeholder="API URL" defaultValue={import.meta.env.VITE_API_URL || "http://localhost:3000"} /><Input placeholder="Mapbox Token" defaultValue={import.meta.env.VITE_MAPBOX_TOKEN || ""} /><Button className="bg-primary-container text-white" onClick={() => toast.success("Configuración guardada")}>Guardar cambios</Button></div></section>;
}

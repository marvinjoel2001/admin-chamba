import { useCallback, useEffect, useState } from "react";
import { fetchAgencies, createAgency, updateAgency, deleteAgency } from "@/lib/admin-api";
import type { AdminAgency } from "@/lib/types";
import { toast } from "sonner";
import {
  Building2,
  Pencil,
  Plus,
  Save,
  X,
  Users,
  Send,
  CheckCircle2,
  CheckCircle2,
  KeyRound,
  Trash2,
} from "lucide-react";

type AgencyForm = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  taxId: string;
  commissionRate: string;
  password: string;
};

const emptyForm: AgencyForm = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  taxId: "",
  commissionRate: "0",
  password: "",
};

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<AdminAgency[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editAgency, setEditAgency] = useState<AdminAgency | null>(null);
  const [form, setForm] = useState<AgencyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAgencies(await fetchAgencies());
    } catch {
      toast.error("No se pudieron cargar las agencias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditAgency(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (agency: AdminAgency) => {
    setEditAgency(agency);
    setForm({
      name: agency.name,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone ?? "",
      taxId: agency.taxId ?? "",
      commissionRate: String(agency.commissionRate),
      password: "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactEmail.trim() || saving) return;
    if (!editAgency && form.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    const commission = parseFloat(form.commissionRate);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast.error("La comisión debe estar entre 0 y 100");
      return;
    }

    setSaving(true);
    try {
      if (editAgency) {
        await updateAgency(editAgency.id, {
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
          commissionRate: commission,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("Agencia actualizada");
      } else {
        await createAgency({
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim(),
          password: form.password,
          contactPhone: form.contactPhone.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
          commissionRate: commission,
        });
        toast.success("Agencia creada");
      }
      setShowModal(false);
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "No se pudo guardar la agencia");
    }
    setSaving(false);
  };

  const handleToggleActive = async (agency: AdminAgency) => {
    try {
      await updateAgency(agency.id, { isActive: !agency.isActive });
      toast.success(agency.isActive ? "Agencia desactivada" : "Agencia activada");
      load();
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  const handleDelete = async (agency: AdminAgency) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la agencia "${agency.name}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      await deleteAgency(agency.id);
      toast.success("Agencia eliminada correctamente");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "No se pudo eliminar la agencia (podría tener datos asociados)");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Agencias de Empleo</h1>
          <p className="text-sm text-on-surface-variant">
            Gestiona las agencias B2B, sus credenciales y comisiones.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 sm:px-5 sm:py-2.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva agencia</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : agencies.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-on-surface-variant">
          No hay agencias registradas aún.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <div
              key={agency.id}
              className={`rounded-xl border p-5 transition ${
                agency.isActive
                  ? "border-white/10 bg-white/5"
                  : "border-white/5 bg-white/[0.02] opacity-60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{agency.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(agency)}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-white/10 hover:text-primary"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(agency)}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-on-surface-variant">{agency.contactEmail}</p>
              {agency.contactPhone && (
                <p className="text-sm text-on-surface-variant">{agency.contactPhone}</p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/5 py-2">
                  <Users className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
                  <p className="font-semibold">{agency.workersCount}</p>
                  <p className="text-on-surface-variant">Workers</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2">
                  <Send className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
                  <p className="font-semibold">{agency.offersCount}</p>
                  <p className="text-on-surface-variant">Ofertas</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2">
                  <CheckCircle2 className="mx-auto mb-1 h-3.5 w-3.5 text-green-400" />
                  <p className="font-semibold">{agency.offersAcceptedCount}</p>
                  <p className="text-on-surface-variant">Ganadas</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">
                  Comisión: <strong>{agency.commissionRate}%</strong>
                </span>
                <button
                  onClick={() => handleToggleActive(agency)}
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    agency.isActive
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {agency.isActive ? "Activa" : "Inactiva"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editAgency ? "Editar agencia" : "Nueva agencia"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-on-surface-variant">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Agencia CleanPro"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-on-surface-variant">
                  Email de acceso *
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="contacto@agencia.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-on-surface-variant">Teléfono</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="70000000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-on-surface-variant">NIT</label>
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="123456789"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-on-surface-variant">
                    Comisión (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-on-surface-variant">
                    <KeyRound className="mr-1 inline h-3 w-3" />
                    {editAgency ? "Nueva contraseña" : "Contraseña *"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder={editAgency ? "(sin cambio)" : "mínimo 6 caracteres"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-on-surface-variant hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.contactEmail.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

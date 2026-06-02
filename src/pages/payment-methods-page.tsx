import { useCallback, useEffect, useState } from "react";
import {
  fetchPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  seedPaymentMethods,
} from "@/lib/admin-api";
import type { PaymentMethod } from "@/lib/types";
import {
  CreditCard,
  Pencil,
  Plus,
  Trash2,
  X,
  DollarSign,
  RefreshCw,
  Check,
} from "lucide-react";

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    icon: "",
    color: "#4CAF50",
    isActive: true,
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPaymentMethods(showInactive);
      setMethods(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditMethod(null);
    setForm({
      name: "",
      code: "",
      description: "",
      icon: "",
      color: "#4CAF50",
      isActive: true,
      sortOrder: methods.length,
    });
    setShowModal(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditMethod(method);
    setForm({
      name: method.name,
      code: method.code,
      description: method.description || "",
      icon: method.icon || "",
      color: method.color,
      isActive: method.isActive,
      sortOrder: method.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || saving) return;
    setSaving(true);
    try {
      if (editMethod) {
        await updatePaymentMethod(editMethod.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          color: form.color,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        });
      } else {
        await createPaymentMethod({
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          color: form.color,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        });
      }
      setShowModal(false);
      await load();
    } catch (e) {
      alert("Error al guardar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (!confirm(`¿Eliminar método de pago "${method.name}"?`)) return;
    try {
      await deletePaymentMethod(method.id);
      await load();
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleSeed = async () => {
    if (!confirm("¿Crear métodos de pago por defecto (Efectivo)?")) return;
    try {
      await seedPaymentMethods();
      await load();
    } catch {
      alert("Error al crear métodos por defecto");
    }
  };

  const getIcon = (iconName: string | null) => {
    switch (iconName) {
      case "money-bill":
        return <DollarSign className="w-5 h-5" />;
      case "credit-card":
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Métodos de Pago</h1>
          <p className="text-sm text-on-surface-variant">
            Gestiona las formas de pago disponibles para los clientes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            Crear por defecto
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80"
          >
            <Plus className="w-4 h-4" />
            Nuevo método
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-white/30 bg-white/5"
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant">
                Orden
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant">
                Icono
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant">
                Nombre
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant">
                Código
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant">
                Descripción
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant">
                Estado
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-on-surface-variant text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  Cargando...
                </td>
              </tr>
            ) : methods.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  No hay métodos de pago. Crea uno nuevo o usa "Crear por defecto".
                </td>
              </tr>
            ) : (
              methods.map((method) => (
                <tr key={method.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-sm">
                    {method.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: method.color + "20" }}
                    >
                      <span style={{ color: method.color }}>
                        {getIcon(method.icon)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {method.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm bg-white/10 px-2 py-1 rounded text-on-surface-variant">
                      {method.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant max-w-xs truncate">
                    {method.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        method.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-on-surface-variant"
                      }`}
                    >
                      {method.isActive ? (
                        <>
                          <Check className="w-3 h-3" />
                          Activo
                        </>
                      ) : (
                        "Inactivo"
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(method)}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-white/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method)}
                        className="p-2 text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl border border-white/10 bg-[#0d1117] shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold">
                {editMethod ? "Editar Método de Pago" : "Nuevo Método de Pago"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-on-surface-variant hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
                  placeholder="Ej: Efectivo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Código <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toLowerCase() })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary disabled:opacity-50"
                  placeholder="Ej: cash"
                  disabled={!!editMethod}
                />
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  Identificador único, no se puede cambiar después
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
                  rows={2}
                  placeholder="Descripción del método de pago"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Icono
                </label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white outline-none focus:border-primary"
                >
                  <option value="" className="bg-[#0d1117]">— Seleccionar —</option>
                  <option value="money-bill" className="bg-[#0d1117]">💵 Dinero (Efectivo)</option>
                  <option value="credit-card" className="bg-[#0d1117]">💳 Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm outline-none focus:border-primary"
                    placeholder="#4CAF50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white outline-none focus:border-primary"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded border-white/30 bg-white/5"
                />
                <span className="text-sm text-on-surface-variant">Activo</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-white/10 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.code.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

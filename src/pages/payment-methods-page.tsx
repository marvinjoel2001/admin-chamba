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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Métodos de Pago</h1>
          <p className="text-slate-600">
            Gestiona las formas de pago disponibles para los clientes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Crear por defecto
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo método
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Orden
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Icono
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Nombre
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Código
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Descripción
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                Estado
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : methods.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay métodos de pago. Crea uno nuevo o usa "Crear por defecto".
                </td>
              </tr>
            ) : (
              methods.map((method) => (
                <tr key={method.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">
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
                    <div className="font-medium text-slate-900">
                      {method.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">
                      {method.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {method.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        method.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
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
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editMethod ? "Editar Método de Pago" : "Nuevo Método de Pago"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Efectivo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toLowerCase() })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: cash"
                  disabled={!!editMethod}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Identificador único, no se puede cambiar después
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Descripción del método de pago"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Icono
                </label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">— Seleccionar —</option>
                  <option value="money-bill">💵 Dinero (Efectivo)</option>
                  <option value="credit-card">💳 Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="#4CAF50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Activo</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.code.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

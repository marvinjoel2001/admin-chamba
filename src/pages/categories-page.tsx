import { useCallback, useEffect, useState } from "react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCommission,
  updateCommission,
} from "@/lib/admin-api";
import type { Category } from "@/lib/types";
import {
  FolderOpen,
  Pencil,
  Plus,
  Percent,
  Save,
  Trash2,
  X,
} from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [commission, setCommission] = useState<number>(0);
  const [commDraft, setCommDraft] = useState("");
  const [savingComm, setSavingComm] = useState(false);
  const [editingComm, setEditingComm] = useState(false);

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, comm] = await Promise.all([
        fetchCategories(),
        fetchCommission(),
      ]);
      setCategories(cats);
      setCommission(comm);
      setCommDraft(String(comm));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditCat(null);
    setForm({ name: "", description: "", icon: "" });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({
      name: cat.name,
      description: cat.description,
      icon: cat.icon ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      if (editCat) {
        await updateCategory(editCat.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          icon: form.icon.trim() || undefined,
        });
      } else {
        await createCategory({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
        });
      }
      setShowModal(false);
      load();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      load();
    } catch {
      /* ignore */
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await updateCategory(cat.id, { active: !cat.active });
      load();
    } catch {
      /* ignore */
    }
  };

  const handleSaveCommission = async () => {
    const val = parseFloat(commDraft);
    if (isNaN(val) || val < 0 || val > 100 || savingComm) return;
    setSavingComm(true);
    try {
      const updated = await updateCommission(val);
      setCommission(updated);
      setEditingComm(false);
    } catch {
      /* ignore */
    }
    setSavingComm(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías y Comisiones</h1>
          <p className="text-sm text-on-surface-variant">
            Gestiona los servicios disponibles y la comisión de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      </div>

      {/* Commission Card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Percent className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Comisión de plataforma</h2>
        </div>
        {editingComm ? (
          <div className="flex items-center gap-3">
            <input
              value={commDraft}
              onChange={(e) => setCommDraft(e.target.value)}
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <span className="text-on-surface-variant">%</span>
            <button
              onClick={handleSaveCommission}
              disabled={savingComm}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </button>
            <button
              onClick={() => {
                setEditingComm(false);
                setCommDraft(String(commission));
              }}
              className="rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-primary">
              {commission}%
            </span>
            <button
              onClick={() => setEditingComm(true)}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-on-surface-variant hover:bg-white/10"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          </div>
        )}
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-on-surface-variant">
          No hay categorías aún.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`rounded-xl border p-5 transition ${
                cat.active
                  ? "border-white/10 bg-white/5"
                  : "border-white/5 bg-white/[0.02] opacity-60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{cat.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-white/10 hover:text-primary"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="rounded p-1.5 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-2">
                {cat.description || "Sin descripción"}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">ID: {cat.id}</span>
                <button
                  onClick={() => handleToggleActive(cat)}
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    cat.active
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {cat.active ? "Activa" : "Inactiva"}
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
                {editCat ? "Editar categoría" : "Nueva categoría"}
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
                <label className="mb-1 block text-sm text-on-surface-variant">
                  Nombre *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Electricidad"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-on-surface-variant">
                  Descripción
                </label>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Instalaciones domésticas e industriales"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-on-surface-variant">
                  Icono (emoji o texto)
                </label>
                <input
                  value={form.icon}
                  onChange={(e) =>
                    setForm({ ...form, icon: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="⚡"
                />
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
                disabled={saving || !form.name.trim()}
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

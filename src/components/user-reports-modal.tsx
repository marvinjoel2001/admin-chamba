import React, { useEffect, useState } from "react";
import { X, AlertTriangle, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import { fetchUserDisputes } from "@/lib/admin-api";
import type { Dispute, AdminUser } from "@/lib/types";
import { DisputeChat } from "@/pages/disputes-page";

interface UserReportsModalProps {
  user: AdminUser;
  onClose: () => void;
}

export function UserReportsModal({ user, onClose }: UserReportsModalProps) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<{ made: Dispute[]; received: Dispute[] }>({ made: [], received: [] });
  const [activeTab, setActiveTab] = useState<"received" | "made">("received");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchUserDisputes(user.id);
        if (mounted) {
          setReports(data);
        }
      } catch (err) {
        console.error("Error fetching user disputes:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user.id]);

  if (selectedDispute) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <DisputeChat
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
        />
      </div>
    );
  }

  const currentList = reports[activeTab];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-rose-950/30 to-black/40">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-500/20 p-2 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Reportes de Usuario</h3>
              <p className="text-xs text-on-surface-variant">
                {user.firstName} {user.lastName ?? ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:bg-white/10 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-white/5 px-4 pt-2">
          <button
            onClick={() => setActiveTab("received")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "received" 
                ? "border-rose-500 text-rose-400" 
                : "border-transparent text-on-surface-variant hover:text-white"
            }`}
          >
            En su contra ({reports.received.length})
          </button>
          <button
            onClick={() => setActiveTab("made")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "made" 
                ? "border-primary text-primary" 
                : "border-transparent text-on-surface-variant hover:text-white"
            }`}
          >
            Hechos por él ({reports.made.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-10 text-center text-on-surface-variant text-sm">Cargando reportes...</div>
          ) : currentList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant">
              <AlertTriangle className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-sm">No hay reportes en esta categoría.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map(dispute => (
                <div key={dispute.id} className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        {dispute.reason}
                        {dispute.status === "resolved" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                            <CheckCircle className="h-3 w-3" /> Resuelto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                            <Clock className="h-3 w-3" /> Abierto
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {new Date(dispute.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDispute(dispute)}
                      className="rounded bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                    >
                      Abrir Chat
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5 mb-3">
                    {dispute.description || "Sin descripción proporcionada."}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-on-surface-variant">
                    {activeTab === "received" ? (
                      <span><strong>Reportado por:</strong> {dispute.reporterName} ({dispute.reporterType})</span>
                    ) : (
                      <span><strong>Contra:</strong> {dispute.reportedName || "Desconocido"} ({dispute.reportedType || "N/A"})</span>
                    )}
                    {dispute.requestTitle && (
                      <span><strong>Trabajo:</strong> {dispute.requestTitle}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

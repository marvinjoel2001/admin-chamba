export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-4xl font-bold tracking-tight">Dashboard Principal</h2>
        <p className="mt-2 text-on-surface-variant">Panel operativo con métricas, actividad y estado del sistema.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Revenue", "Workers", "Requests", "Clients"].map((k) => (
          <div key={k} className="glass-panel rounded-xl p-6">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">{k}</p>
            <p className="mt-1 text-3xl font-semibold">{Math.floor(Math.random() * 500 + 100)}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-xl">Live Activity</h3>
        <p className="mt-2 text-on-surface-variant">Actividad en tiempo real integrada con los módulos.</p>
      </div>
    </section>
  );
}

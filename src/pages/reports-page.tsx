import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { jobsByCategory, revenueTrend } from "@/data/mock";

const colors = ["#d2bbff", "#ffe083", "#4a4455", "#7c3aed"];

export default function ReportsPage() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-5xl font-bold tracking-tight">Analytics Overview</h2>
          <p className="mt-2 text-on-surface-variant">Monitor service performance and business health metrics.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Total Revenue", "New Clients", "Completion Rate", "Canceled Jobs"].map((k) => (
          <div key={k} className="glass-panel rounded-xl p-6"><p className="text-xs uppercase tracking-wider text-on-surface-variant">{k}</p><h3 className="mt-1 text-3xl font-semibold">{k === "Total Revenue" ? "$124,500" : k === "New Clients" ? "342" : k === "Completion Rate" ? "94.8%" : "18"}</h3></div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel rounded-xl p-6 lg:col-span-2">
          <h3 className="mb-4 text-2xl">Revenue Over Time</h3>
          <div className="h-80"><ResponsiveContainer><LineChart data={revenueTrend}><CartesianGrid stroke="rgba(255,255,255,.08)" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="revenue" stroke="#d2bbff" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <h3 className="mb-4 text-xl">Jobs by Category</h3>
          <div className="h-80"><ResponsiveContainer><PieChart><Pie data={jobsByCategory} dataKey="value" innerRadius={65} outerRadius={95}>{jobsByCategory.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Clock,
  Cpu,
  Database,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { useThemeColors } from "./useThemeColors";
import { CATEGORIES } from "@/utils/constants";
import { compact, initials, timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { AdminStats, User } from "@/utils/types";

const RANGES = [7, 14, 30] as const;

function Card({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className={cn("glass rounded-3xl p-5", className)}>
      {children}
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, value, hint, delay }: { icon: React.ElementType; label: string; value: string; hint?: string; delay?: number }) {
  return (
    <Card delay={delay} className="relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[rgb(var(--accent)/0.12)] blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-panel-solid px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-fg">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const colors = useThemeColors(user?.preferences.accent);
  const [days, setDays] = useState<(typeof RANGES)[number]>(14);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setStats(await api.stats(days));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, then poll
    load();
    const t = setInterval(load, 30_000); // live-ish refresh
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => api.users(userSearch).then((r) => setUsers(r.users), (e) => toast.error(e.message)), 250);
    return () => clearTimeout(t);
  }, [userSearch]);

  const daily = useMemo(
    () => stats?.daily.map((d) => ({ ...d, label: new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }) })) || [],
    [stats]
  );

  const categoryData = useMemo(() => {
    const palette = [colors.accent, colors.accent2, "#f59e0b", "#10b981"];
    return CATEGORIES.map((c, i) => ({
      name: c.label,
      emoji: c.emoji,
      value: stats?.categories.find((x) => x.category === c.id)?.count || 0,
      color: palette[i],
    }));
  }, [stats, colors]);

  const toggleRole = async (u: User) => {
    const role = u.role === "admin" ? "user" : "admin";
    try {
      const r = await api.setRole(u.id, role);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: r.user.role } : x)));
      toast.success(`${u.name} is now ${role === "admin" ? "an admin" : "a regular user"}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const t = stats?.totals;
  const cacheRate = stats ? Math.round((stats.system.cache.hits / Math.max(1, stats.system.cache.hits + stats.system.cache.misses)) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Admin dashboard"
        subtitle="Usage, engagement and AI performance"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl border border-line bg-elev/60 p-0.5 sm:flex">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setDays(r)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition", days === r ? "bg-panel-solid text-fg shadow" : "text-muted hover:text-fg")}>
                  {r}d
                </button>
              ))}
            </div>
            <button onClick={load} className="rounded-xl border border-line p-2 text-muted transition hover:text-fg" aria-label="Refresh" title="Refresh">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        }
      />

      {!stats || !t ? (
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-hover" />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Users} label="Total users" value={compact(t.users)} hint={`${t.activeUsers7d} active in the last 7 days`} />
            <Kpi icon={MessagesSquare} label="Conversations" value={compact(t.conversations)} hint={`${(t.messages / Math.max(1, t.conversations)).toFixed(1)} messages per chat`} delay={0.05} />
            <Kpi icon={Smile} label="Satisfaction" value={t.satisfaction === null ? "—" : `${t.satisfaction}%`} hint={`${stats.ratings.up + stats.ratings.down} rated replies`} delay={0.1} />
            <Kpi icon={Clock} label="Avg response time" value={t.avgLatencyMs ? `${(t.avgLatencyMs / 1000).toFixed(2)}s` : "—"} hint={`${t.errors} failed replies`} delay={0.15} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2" delay={0.1}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Activity</h3>
                  <p className="text-xs text-muted">Messages and active users per day</p>
                </div>
                <div className="flex gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colors.accent }} /> Messages</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colors.accent2 }} /> Active users</span>
                </div>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.accent} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gUsr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.accent2} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={colors.accent2} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.grid }} />
                    <Area type="monotone" dataKey="messages" name="Messages" stroke={colors.accent} strokeWidth={2.5} fill="url(#gMsg)" />
                    <Area type="monotone" dataKey="activeUsers" name="Active users" stroke={colors.accent2} strokeWidth={2} fill="url(#gUsr)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card delay={0.15}>
              <h3 className="font-semibold">Chat modes</h3>
              <p className="text-xs text-muted">Which modes people use</p>
              <div className="relative mt-2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3} stroke="none">
                      {categoryData.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-2xl font-semibold">{t.conversations}</div>
                    <div className="text-[11px] text-muted">chats</div>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {categoryData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="text-muted">{c.emoji} {c.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{c.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card delay={0.2}>
              <h3 className="font-semibold">Response quality</h3>
              <p className="text-xs text-muted">User ratings on AI replies</p>
              <div className="mt-5 space-y-4">
                {[
                  { label: "Helpful", value: stats.ratings.up, icon: ThumbsUp, cls: "bg-emerald-500" },
                  { label: "Not helpful", value: stats.ratings.down, icon: ThumbsDown, cls: "bg-red-500" },
                  { label: "Unrated", value: stats.ratings.unrated, icon: MessageSquare, cls: "bg-line-strong" },
                ].map((r) => {
                  const total = stats.ratings.up + stats.ratings.down + stats.ratings.unrated || 1;
                  return (
                    <div key={r.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted"><r.icon className="h-3.5 w-3.5" /> {r.label}</span>
                        <span className="font-medium tabular-nums">{r.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-hover">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(r.value / total) * 100}%` }} transition={{ duration: 0.8 }} className={cn("h-full rounded-full", r.cls)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-2" delay={0.25}>
              <h3 className="font-semibold">Busiest hours</h3>
              <p className="text-xs text-muted">All-time messages by hour of day (UTC)</p>
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourly} margin={{ left: -24, right: 4 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="hour" tick={{ fill: colors.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(h) => `${h}h`} interval={2} />
                    <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: colors.grid }} labelFormatter={(h) => `${h}:00`} />
                    <Bar dataKey="messages" name="Messages" fill={colors.accent} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card delay={0.3}>
              <h3 className="font-semibold">System</h3>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  { icon: Cpu, label: "AI provider", value: `${stats.system.provider} · ${stats.system.model}` },
                  { icon: Database, label: "Storage", value: stats.system.storage === "mongodb" ? "MongoDB" : "Local file store" },
                  { icon: Wifi, label: "Online now", value: `${stats.system.onlineUsers} user${stats.system.onlineUsers === 1 ? "" : "s"}` },
                  { icon: Zap, label: "Cache hit rate", value: `${cacheRate}% (${stats.system.cache.hits} hits)` },
                  { icon: Activity, label: "Uptime", value: `${Math.floor(stats.system.uptimeSec / 3600)}h ${Math.floor((stats.system.uptimeSec % 3600) / 60)}m` },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-hover text-muted"><r.icon className="h-4 w-4" /></span>
                    <span className="text-muted">{r.label}</span>
                    <span className="ml-auto truncate text-right font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card delay={0.35}>
              <h3 className="font-semibold">Most active users</h3>
              <div className="mt-4 space-y-3">
                {stats.topUsers.length === 0 && <p className="text-sm text-subtle">No activity yet.</p>}
                {stats.topUsers.map((u, i) => {
                  const max = stats.topUsers[0]?.messages || 1;
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="w-4 text-xs text-subtle">{i + 1}</span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-gradient text-xs font-semibold text-white">{initials(u.name)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate font-medium">{u.name}</span>
                          <span className="tabular-nums text-muted">{u.messages}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-hover">
                          <div className="h-full rounded-full bg-accent-gradient" style={{ width: `${(u.messages / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card delay={0.4}>
              <h3 className="font-semibold">Recent feedback</h3>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                {stats.recentFeedback.length === 0 && <p className="text-sm text-subtle">No ratings yet.</p>}
                {stats.recentFeedback.map((f) => (
                  <div key={f.id} className="rounded-2xl border border-line p-3">
                    <div className="flex items-center gap-2 text-xs">
                      {f.rating === 1 ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /> : <ThumbsDown className="h-3.5 w-3.5 text-red-500" />}
                      <span className="font-medium">{f.userName}</span>
                      <span className="ml-auto text-subtle">{timeAgo(f.updatedAt)}</span>
                    </div>
                    {f.feedback && <p className="mt-1.5 text-sm">&ldquo;{f.feedback}&rdquo;</p>}
                    <p className="mt-1 line-clamp-2 text-xs text-subtle">{f.excerpt.replace(/[#*`>]/g, "")}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card delay={0.45}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Users</h3>
                <p className="text-xs text-muted">Manage roles and see who is most engaged</p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name or email"
                  className="h-9 w-64 rounded-xl border border-line bg-elev/60 pl-9 pr-3 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Messages</th>
                    <th className="pb-3 font-medium">Last active</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-hover text-xs font-semibold">{initials(u.name)}</span>
                          <div>
                            <div className="font-medium">{u.name}{u.id === user?.id && <span className="ml-1.5 text-xs text-subtle">(you)</span>}</div>
                            <div className="text-xs text-subtle">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", u.role === "admin" ? "bg-[rgb(var(--accent)/0.12)] text-accent" : "bg-hover text-muted")}>{u.role}</span>
                      </td>
                      <td className="tabular-nums">{u.messageCount ?? 0}</td>
                      <td className="text-muted">{timeAgo(u.lastActiveAt)}</td>
                      <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="text-right">
                        {u.id !== user?.id && (
                          <button onClick={() => toggleRole(u)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-hover hover:text-fg">
                            {u.role === "admin" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                            {u.role === "admin" ? "Remove admin" : "Make admin"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

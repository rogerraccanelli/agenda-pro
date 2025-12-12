// app/(private)/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as limitFn,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";


import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
} from "recharts";

import Link from "next/link";
import { Building, Clock, Wallet, Users, LayoutDashboard } from "lucide-react";

type FinanceDoc = {
  id?: string;
  valor: number;
  tipo?: "entrada" | "saida" | string;
  categoria?: string;
  createdAt?: any;
  descricao?: string;
  appointmentId?: string;
};

type ClientDoc = {
  id?: string;
  nome?: string;
  telefone?: string;
  createdAt?: any;
  [k: string]: any;
};

type ApptDoc = {
  id?: string;
  nome?: string;
  servicoNome?: string;
  concluido?: boolean;
  concluidoAt?: any;
  data?: any;
  time?: string;
  [k: string]: any;
};

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp && typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function monthLabel(year: number, monthIndex: number) {
  // monthIndex: 0..11
  return dayjs(new Date(year, monthIndex, 1)).format("MMM YYYY");
}

export default function DashboardPage() {
  const router = useRouter();
  const [userLoaded, setUserLoaded] = useState(false);
  const [finances, setFinances] = useState<FinanceDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [appointments, setAppointments] = useState<ApptDoc[]>([]);

  // loading flags
  const [loadingFinances, setLoadingFinances] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUserLoaded(true);
    });
    return () => unsub();
  }, [router]);

  // subscribe finances
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, "users", uid, "finances"), orderBy("createdAt", "desc"));
    setLoadingFinances(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: FinanceDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            valor: typeof data.valor === "number" ? data.valor : Number(data.valor) || 0,
            tipo: data.tipo,
            categoria: data.categoria,
            createdAt: data.createdAt,
            descricao: data.descricao,
            appointmentId: data.appointmentId,
          });
        });
        setFinances(list);
        setLoadingFinances(false);
      },
      (err) => {
        console.error("finances onSnapshot error:", err);
        setLoadingFinances(false);
      }
    );
    return () => unsub();
  }, [userLoaded]);

  // subscribe clients (last 5)
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, "users", uid, "clients"), orderBy("createdAt", "desc"), limitFn(5));
    setLoadingClients(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ClientDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            nome: data.nome || data.name,
            telefone: data.telefone,
            createdAt: data.createdAt,
            ...data,
          });
        });
        setClients(list);
        setLoadingClients(false);
      },
      (err) => {
        console.error("clients onSnapshot error:", err);
        setLoadingClients(false);
      }
    );
    return () => unsub();
  }, [userLoaded]);

  // subscribe appointments (last 5 completed)
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    // get completed appointments ordered by concluded date desc
    const q = query(
      collection(db, "users", uid, "appointments"),
      where("concluido", "==", true),
      orderBy("concluidoAt", "desc"),
      limitFn(5)
    );
    setLoadingAppts(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ApptDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            nome: data.nome,
            servicoNome: data.servicoNome,
            concluido: data.concluido,
            concluidoAt: data.concluidoAt,
            data: data.data,
            time: data.time,
            ...data,
          });
        });
        setAppointments(list);
        setLoadingAppts(false);
      },
      (err) => {
        console.error("appointments onSnapshot error:", err);
        setLoadingAppts(false);
      }
    );
    return () => unsub();
  }, [userLoaded]);

  // Derived KPIs
  const now = dayjs();
  const totals = useMemo(() => {
    const res = {
      totalEntradaDia: 0,
      totalEntradaMes: 0,
      totalEntradaAno: 0,
      totalSaidaMes: 0,
      saldoMes: 0,
      qtdAtendimentosConcluidosHoje: 0,
      qtdAgendamentosHoje: 0,
    };

    for (const f of finances) {
      const date = toDate(f.createdAt) ?? new Date();
      if (!date) continue;
      const isSameDay = dayjs(date).isSame(now, "day");
      const isSameMonth = dayjs(date).isSame(now, "month");
      const isSameYear = dayjs(date).isSame(now, "year");

      if ((f.tipo || "").toString().toLowerCase() === "entrada") {
        if (isSameDay) res.totalEntradaDia += f.valor;
        if (isSameMonth) res.totalEntradaMes += f.valor;
        if (isSameYear) res.totalEntradaAno += f.valor;
        if (isSameMonth) res.saldoMes += f.valor;
      } else {
        // treat others as saída
        if (isSameMonth) res.totalSaidaMes += f.valor;
        if (isSameMonth) res.saldoMes -= f.valor;
      }
    }

    // appointments counts
    for (const a of appointments) {
      const concludedAt = toDate(a.concluidoAt);
      if (concludedAt && dayjs(concludedAt).isSame(now, "day")) res.qtdAtendimentosConcluidosHoje += 1;
    }

    // agendamentos of the day (not necessarily concluded) from finances? better to count appointments with date/time for today
    // we haven't subscribed to all appointments; so we approximate by counting appointments array that might be limited.
    // For a reliable count we could run a fire query, but to keep minimal changes we'll compute from appointments and finances links.
    // Simpler: count appointments with data same day if available in this list (limited). We'll leave qtdAgendamentosHoje as appointments concluded today for now.
    res.qtdAgendamentosHoje = res.qtdAtendimentosConcluidosHoje;

    return res;
  }, [finances, appointments, now]);

  // Build monthly saldo data for last 12 months
  const monthlySaldo = useMemo(() => {
    // Build map year-month => saldo
    const end = dayjs();
    const months: { key: string; label: string; year: number; monthIndex: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = end.subtract(i, "month");
      months.push({
        key: `${d.year()}-${d.month() + 1}`,
        label: monthLabel(d.year(), d.month()),
        year: d.year(),
        monthIndex: d.month(),
      });
    }

    const map = new Map<string, number>();
    for (const m of months) map.set(m.key, 0);

    for (const f of finances) {
      const date = toDate(f.createdAt);
      if (!date) continue;
      const d = dayjs(date);
      const key = `${d.year()}-${d.month() + 1}`;
      if (!map.has(key)) continue; // ignore out of range
      const current = map.get(key) || 0;
      if ((f.tipo || "").toString().toLowerCase() === "entrada") map.set(key, current + (f.valor || 0));
      else map.set(key, current - (f.valor || 0));
    }

    // produce array
    const data = months.map((m) => ({
      month: m.label,
      key: m.key,
      saldo: Number((map.get(m.key) || 0).toFixed(2)),
    }));

    return data;
  }, [finances]);

  // last 5 finances (already ordered desc), show first 5
  const lastFinances = useMemo(() => finances.slice(0, 5), [finances]);

  // format currency BRL
  function formatBRL(v: number) {
    try {
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } catch {
      // fallback
      return `R$ ${v.toFixed(2).replace(".", ",")}`;
    }
  }

  const PRIMARY = "bg-[#6D28D9] hover:bg-[#5B21B6]";
  const PRIMARY_TEXT = "text-white";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl border shadow-sm">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold">Dashboard</h1>
            <p className="text-sm text-slate-500">Visão geral — finanças, atendimentos e clientes.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className={`rounded-md ${PRIMARY} ${PRIMARY_TEXT}`} onClick={() => router.push("/finances")}>
            Ir para Financeiro
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-xs text-slate-400">Entrada (hoje)</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xl font-semibold">{formatBRL(totals.totalEntradaDia)}</div>
            <div className="text-sm text-slate-500">Hoje</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-xs text-slate-400">Entrada (mês)</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xl font-semibold">{formatBRL(totals.totalEntradaMes)}</div>
            <div className="text-sm text-slate-500">Mês</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-xs text-slate-400">Saldo (mês)</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xl font-semibold">{formatBRL(totals.saldoMes)}</div>
            <div className="text-sm text-slate-500">Mês</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="text-xs text-slate-400">Atendimentos (hoje)</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xl font-semibold">{totals.qtdAtendimentosConcluidosHoje}</div>
            <div className="text-sm text-slate-500">Concluídos</div>
          </div>
        </div>
      </div>

      {/* Atalhos cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link href="/agenda" className="block">
          <div className="bg-white rounded-2xl border p-4 h-full flex flex-col items-center justify-center hover:shadow-md">
            <div className="p-2 bg-[#F5F3FF] rounded-lg mb-2"><Clock size={18} /></div>
            <div className="text-sm font-medium">Agenda</div>
          </div>
        </Link>

        <Link href="/finances" className="block">
          <div className="bg-white rounded-2xl border p-4 h-full flex flex-col items-center justify-center hover:shadow-md">
            <div className="p-2 bg-[#F5F3FF] rounded-lg mb-2"><Wallet size={18} /></div>
            <div className="text-sm font-medium">Financeiro</div>
          </div>
        </Link>

        <Link href="/services" className="block">
          <div className="bg-white rounded-2xl border p-4 h-full flex flex-col items-center justify-center hover:shadow-md">
            <div className="p-2 bg-[#F5F3FF] rounded-lg mb-2"><Building size={18} /></div>
            <div className="text-sm font-medium">Serviços</div>
          </div>
        </Link>

        <Link href="/clientes" className="block">
          <div className="bg-white rounded-2xl border p-4 h-full flex flex-col items-center justify-center hover:shadow-md">
            <div className="p-2 bg-[#F5F3FF] rounded-lg mb-2"><Users size={18} /></div>
            <div className="text-sm font-medium">Clientes</div>
          </div>
        </Link>

        <Link href="/config" className="block">
          <div className="bg-white rounded-2xl border p-4 h-full flex flex-col items-center justify-center hover:shadow-md">
            <div className="p-2 bg-[#F5F3FF] rounded-lg mb-2"><LayoutDashboard size={18} /></div>
            <div className="text-sm font-medium">Config</div>
          </div>
        </Link>
      </div>

      {/* Charts and lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart area (spans 2 cols on large) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Saldo mensal (últimos 12 meses)</h3>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthlySaldo} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                <Legend />
                <Bar dataKey="saldo" name="Saldo (R$)" barSize={28} />
                <Line type="monotone" dataKey="saldo" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: lists */}
        <div className="space-y-6">
          {/* Latest finances */}
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">Últimos lançamentos</h4>
                <p className="text-xs text-slate-500">Últimos 5 registros</p>
              </div>
              <Link href="/finances" className="text-sm text-slate-500">Ver todos</Link>
            </div>

            {loadingFinances ? (
              <div className="text-sm text-slate-400">Carregando...</div>
            ) : lastFinances.length === 0 ? (
              <div className="text-sm text-slate-400">Nenhum lançamento.</div>
            ) : (
              <div className="space-y-2">
                {lastFinances.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="text-sm font-medium">{f.categoria || f.descricao || "Lançamento"}</div>
                      <div className="text-xs text-slate-500">{f.createdAt ? dayjs(toDate(f.createdAt)).format("DD/MM/YYYY HH:mm") : ""}</div>
                    </div>
                    <div className={`font-medium ${ (f.tipo || "").toString().toLowerCase() === "entrada" ? "text-green-600" : "text-red-600" }`}>
                      { (f.tipo || "").toString().toLowerCase() === "entrada" ? "+" : "-" } {formatBRL(f.valor || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest clients */}
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">Últimos clientes</h4>
                <p className="text-xs text-slate-500">Últimos 5 adicionados</p>
              </div>
              <Link href="/clientes" className="text-sm text-slate-500">Ver todos</Link>
            </div>

            {loadingClients ? (
              <div className="text-sm text-slate-400">Carregando...</div>
            ) : clients.length === 0 ? (
              <div className="text-sm text-slate-400">Nenhum cliente.</div>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="text-sm font-medium">{c.nome || "—"}</div>
                      <div className="text-xs text-slate-500">{c.telefone || ""}</div>
                    </div>
                    <div className="text-xs text-slate-500">{c.createdAt ? dayjs(toDate(c.createdAt)).format("DD/MM/YYYY") : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest appointments */}
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">Últimos atendimentos</h4>
                <p className="text-xs text-slate-500">Últimos 5 concluídos</p>
              </div>
              <Link href="/agenda" className="text-sm text-slate-500">Ver agenda</Link>
            </div>

            {loadingAppts ? (
              <div className="text-sm text-slate-400">Carregando...</div>
            ) : appointments.length === 0 ? (
              <div className="text-sm text-slate-400">Nenhum atendimento concluído ainda.</div>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => (
                  <div key={a.id} className="p-2 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{a.nome}</div>
                        <div className="text-xs text-slate-500">{a.servicoNome || ""}</div>
                      </div>
                      <div className="text-xs text-slate-500">{a.concluidoAt ? dayjs(toDate(a.concluidoAt)).format("DD/MM/YYYY HH:mm") : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

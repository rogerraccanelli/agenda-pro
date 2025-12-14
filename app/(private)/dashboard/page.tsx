"use client";

import { useEffect, useMemo, useState } from "react";
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
import Link from "next/link";

import {
  ResponsiveContainer,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
} from "recharts";

import {
  LayoutDashboard,
  Clock,
  Wallet,
  Building,
  Users,
} from "lucide-react";

/* =========================
   TYPES
========================= */

type FinanceDoc = {
  id?: string;
  valor: number;
  tipo?: "entrada" | "saida" | string;
  categoria?: string;
  createdAt?: any;
};

type ClientDoc = {
  id?: string;
  nome?: string;
  telefone?: string;
  ultimaVisita?: any;
  ultimoServico?: string;
};

type ApptDoc = {
  id?: string;
  nome?: string;
  servicoNome?: string;
  concluidoAt?: any;
};

/* =========================
   HELPERS
========================= */

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp && typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* =========================
   COMPONENT
========================= */

export default function DashboardPage() {
  const [userLoaded, setUserLoaded] = useState(false);

  const [finances, setFinances] = useState<FinanceDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [appointments, setAppointments] = useState<ApptDoc[]>([]);

  /* =========================
     AUTH
  ========================= */

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => {
      setUserLoaded(true);
    });
    return () => unsub();
  }, []);

  /* =========================
     DATA
  ========================= */

  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      query(collection(db, "users", uid, "finances"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: FinanceDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setFinances(list);
      }
    );
  }, [userLoaded]);

  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      query(
        collection(db, "users", uid, "clientes"),
        orderBy("ultimaVisita", "desc"),
        limitFn(5)
      ),
      (snap) => {
        const list: ClientDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setClients(list);
      }
    );
  }, [userLoaded]);

  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;

    return onSnapshot(
      query(
        collection(db, "users", uid, "appointments"),
        where("concluido", "==", true),
        orderBy("concluidoAt", "desc"),
        limitFn(5)
      ),
      (snap) => {
        const list: ApptDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setAppointments(list);
      }
    );
  }, [userLoaded]);

  /* =========================
     KPIs
  ========================= */

  const now = dayjs();

  const kpis = useMemo(() => {
    let entradaDia = 0;
    let faturamentoMes = 0;
    let saldoCaixa = 0;
    let atendimentosHoje = 0;

    finances.forEach((f) => {
      const d = toDate(f.createdAt);
      if (!d) return;

      const tipo = (f.tipo || "").toLowerCase();
      const isMes = dayjs(d).isSame(now, "month");

      if (tipo === "entrada") {
        if (dayjs(d).isSame(now, "day")) entradaDia += f.valor;
        if (isMes) {
          faturamentoMes += f.valor;
          saldoCaixa += f.valor;
        }
      }

      if (tipo === "saida" && isMes) {
        saldoCaixa -= f.valor;
      }
    });

    appointments.forEach((a) => {
      const d = toDate(a.concluidoAt);
      if (d && dayjs(d).isSame(now, "day")) atendimentosHoje++;
    });

    return { entradaDia, faturamentoMes, saldoCaixa, atendimentosHoje };
  }, [finances, appointments, now]);

  /* =========================
     CHART
  ========================= */

  const monthlyFaturamento = useMemo(() => {
    const map = new Map<string, number>();
    const base = dayjs();

    for (let i = 11; i >= 0; i--) {
      const d = base.subtract(i, "month");
      map.set(d.format("YYYY-MM"), 0);
    }

    finances.forEach((f) => {
      const d = toDate(f.createdAt);
      if (!d) return;
      if ((f.tipo || "").toLowerCase() !== "entrada") return;

      const key = dayjs(d).format("YYYY-MM");
      if (!map.has(key)) return;

      map.set(key, (map.get(key) || 0) + f.valor);
    });

    return Array.from(map.entries()).map(([k, valor]) => ({
      mes: dayjs(k + "-01").format("MMM YYYY"),
      valor,
    }));
  }, [finances]);

  if (!userLoaded) return null;

  /* =========================
     UI
  ========================= */

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral do negócio</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Entrada hoje" value={brl(kpis.entradaDia)} icon={<Wallet />} />
        <Kpi title="Saldo do caixa" value={brl(kpis.saldoCaixa)} icon={<Wallet />} />
        <Kpi title="Faturamento mês" value={brl(kpis.faturamentoMes)} icon={<Wallet />} />
        <Kpi title="Atendimentos hoje" value={kpis.atendimentosHoje} icon={<Clock />} />
      </div>

      {/* ATALHOS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Shortcut href="/agenda" icon={<Clock />} label="Agenda" />
        <Shortcut href="/finances" icon={<Wallet />} label="Financeiro" />
        <Shortcut href="/services" icon={<Building />} label="Serviços" />
        <Shortcut href="/clientes" icon={<Users />} label="Clientes" />
        <Shortcut href="/config" icon={<LayoutDashboard />} label="Config" />
      </div>

      {/* GRÁFICO */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-md p-5 overflow-x-hidden">
        <h3 className="font-semibold mb-3">Faturamento Últimos 12 meses</h3>

        <div className="w-full overflow-x-hidden">
          <ResponsiveContainer width="99%" height={320}>
            <ComposedChart data={monthlyFaturamento}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v: any) => brl(Number(v))} />
              <Legend />
              <Bar dataKey="valor" fill="#6D28D9" barSize={32} />
              <Line dataKey="valor" stroke="#8B5CF6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* LISTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Últimos clientes">
          {clients.length === 0 ? <Empty /> : clients.map((c) => (
            <Item key={c.id} title={c.nome} subtitle={c.ultimoServico} date={c.ultimaVisita} />
          ))}
        </Card>

        <Card title="Últimos atendimentos">
          {appointments.length === 0 ? <Empty /> : appointments.map((a) => (
            <Item key={a.id} title={a.nome} subtitle={a.servicoNome} date={a.concluidoAt} />
          ))}
        </Card>

        <Card title="Últimos lançamentos">
          {finances.slice(0, 5).length === 0 ? <Empty /> : finances.slice(0, 5).map((f) => (
            <Item key={f.id} title={f.categoria || "Lançamento"} subtitle={brl(f.valor)} date={f.createdAt} />
          ))}
        </Card>
      </div>
    </div>
  );
}

/* =========================
   UI PARTS
========================= */

function Kpi({ title, value, icon }: any) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-md p-4">
      <div className="absolute right-4 top-4 text-purple-200">{icon}</div>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function Shortcut({ href, icon, label }: any) {
  return (
    <Link href={href}>
      <div className="rounded-3xl bg-gradient-to-br from-purple-600 to-purple-700 text-white p-4 flex flex-col items-center justify-center shadow-md hover:shadow-xl transition">
        <div className="mb-2">{icon}</div>
        <div className="text-sm font-medium">{label}</div>
      </div>
    </Link>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-3xl border border-purple-200 shadow-md overflow-hidden bg-white">
      <div className="bg-[#6D28D9] px-4 py-3">
        <h4 className="font-semibold text-white">{title}</h4>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function Item({ title, subtitle, date }: any) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
      <div className="font-medium">{title}</div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
      {date && (
        <div className="text-xs text-slate-400 mt-1">
          {dayjs(toDate(date)).format("DD/MM/YYYY")}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-slate-400">Nenhum registro encontrado.</div>;
}

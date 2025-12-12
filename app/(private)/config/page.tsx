// app/(private)/config/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import dayjs from "dayjs";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Clock, CalendarRange, Ban, User } from "lucide-react";

type Bloqueio = {
  id: string;
  data: string; // YYYY-MM-DD
  inicio: string; // HH:mm
  fim: string; // HH:mm
};

type ConfigDoc = {
  estabelecimentoNome?: string;
  horarios?: { abertura?: string; fechamento?: string };
  slotMinimo?: number;
  bloqueios?: Bloqueio[];
  tema?: string;
  updatedAt?: any;
};

export default function ConfigPage() {
  const [userLoaded, setUserLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // config state
  const [estabelecimentoNome, setEstabelecimentoNome] = useState("");
  const [horarios, setHorarios] = useState<{ abertura: string; fechamento: string }>({
    abertura: "08:00",
    fechamento: "20:00",
  });
  const SLOT_MINIMO = 30; // fixo conforme definição
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);

  // modal state (adicionar bloqueio)
  const [modalOpen, setModalOpen] = useState(false);
  const [blkData, setBlkData] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [blkInicio, setBlkInicio] = useState<string>("13:00");
  const [blkFim, setBlkFim] = useState<string>("14:00");

  // user info (read-only)
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // helpers
  function uidOrNull() {
    return auth.currentUser?.uid ?? null;
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUserLoaded(!!u);
      if (u) {
        setUserName(u.displayName || null);
        setUserEmail(u.email || null);
      }
    });
    return () => unsub();
  }, []);

  // load config (single document at users/{uid}/config/settings)
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    setLoadingConfig(true);
    const uid = auth.currentUser.uid;
    const configRef = doc(db, "users", uid, "config", "settings");

    // get once and subscribe to changes
    const unsub = onSnapshot(configRef, async (snap) => {
      if (!snap.exists()) {
        // keep defaults
        setEstabelecimentoNome("");
        setHorarios({ abertura: "08:00", fechamento: "20:00" });
        setBloqueios([]);
        setLoadingConfig(false);
        return;
      }
      const data = snap.data() as ConfigDoc;
      setEstabelecimentoNome(data.estabelecimentoNome || "");
      setHorarios({
        abertura: data.horarios?.abertura || "08:00",
        fechamento: data.horarios?.fechamento || "20:00",
      });
      setBloqueios((data.bloqueios || []).map((b) => ({
        id: b.id,
        data: b.data,
        inicio: b.inicio,
        fim: b.fim,
      })));
      setLoadingConfig(false);
    });

    return () => unsub();
  }, [userLoaded]);

  // add block (temporário in-memory until Save All)
  function abrirModalBloqueio() {
    setBlkData(dayjs().format("YYYY-MM-DD"));
    setBlkInicio("13:00");
    setBlkFim("14:00");
    setModalOpen(true);
  }

  function fecharModalBloqueio() {
    setModalOpen(false);
  }

  function validarBloqueio(data: string, inicio: string, fim: string) {
    if (!data) return "Data inválida.";
    if (!inicio || !fim) return "Horários inválidos.";
    const s = dayjs(`${data}T${inicio}`);
    const e = dayjs(`${data}T${fim}`);
    if (!s.isValid() || !e.isValid()) return "Horários inválidos.";
    if (!e.isAfter(s)) return "Hora final deve ser maior que início.";
    return null;
  }

  function gerarIdBloqueio() {
    return Math.random().toString(36).slice(2, 9);
  }

  function handleAdicionarBloqueio() {
    const err = validarBloqueio(blkData, blkInicio, blkFim);
    if (err) return alert(err);
    const novo: Bloqueio = {
      id: gerarIdBloqueio(),
      data: blkData,
      inicio: blkInicio,
      fim: blkFim,
    };
    setBloqueios((prev) => [...prev, novo].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)));
    setModalOpen(false);
  }

  function handleRemoverBloqueio(id: string) {
    if (!confirm("Remover bloqueio?")) return;
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
  }

  // save all (write single doc)
  async function handleSalvarTodasConfiguracoes() {
    if (!auth.currentUser) return alert("Usuário não autenticado.");
    const uid = auth.currentUser.uid;
    const ref = doc(db, "users", uid, "config", "settings");
    const payload: ConfigDoc = {
      estabelecimentoNome: estabelecimentoNome.trim(),
      horarios: {
        abertura: horarios.abertura,
        fechamento: horarios.fechamento,
      },
      slotMinimo: SLOT_MINIMO,
      bloqueios: bloqueios,
      tema: "light",
      updatedAt: new Date(),
    };

    try {
      setSaving(true);
      await setDoc(ref, payload, { merge: true });
      setSaving(false);
      alert("Configurações salvas.");
    } catch (err) {
      console.error(err);
      setSaving(false);
      alert("Erro ao salvar configurações.");
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
            <Building size={20} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold">Configurações</h1>
            <p className="text-sm text-slate-500">Ajustes do estúdio e bloqueios de agenda.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className={`rounded-md ${PRIMARY} ${PRIMARY_TEXT}`} onClick={handleSalvarTodasConfiguracoes}>
            {saving ? "Salvando..." : "Salvar todas as configurações"}
          </Button>
        </div>
      </div>

      {/* Main grid: left column (config cards) / right column (user + help) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: settings area (cards stacked) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estabelecimento */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border">
                  <Building size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Estabelecimento</h3>
                  <p className="text-xs text-slate-500">Nome exibido no app e relatórios.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Nome do estabelecimento</Label>
              <Input className="w-full" value={estabelecimentoNome} onChange={(e) => setEstabelecimentoNome(e.target.value)} placeholder="Ex: Studio RGS" />
            </div>
          </div>

          {/* Horários */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Horário de funcionamento</h3>
                  <p className="text-xs text-slate-500">Mesmo horário todos os dias (configuração simples para portfólio).</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Abertura</Label>
                <Input className="w-full" type="time" value={horarios.abertura} onChange={(e) => setHorarios((s) => ({ ...s, abertura: e.target.value }))} />
              </div>
              <div>
                <Label>Fechamento</Label>
                <Input className="w-full" type="time" value={horarios.fechamento} onChange={(e) => setHorarios((s) => ({ ...s, fechamento: e.target.value }))} />
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3">Duração mínima do slot: <span className="font-semibold">{SLOT_MINIMO} minutos</span></p>
          </div>

          {/* Bloqueios */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border">
                  <Ban size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Bloqueios de agenda</h3>
                  <p className="text-xs text-slate-500">Crie períodos em que não aceita agendamentos.</p>
                </div>
              </div>

              <div>
                <Button className="rounded-md" onClick={abrirModalBloqueio}>Adicionar bloqueio</Button>
              </div>
            </div>

            <div className="space-y-3">
              {bloqueios.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum bloqueio criado.</p>
              ) : (
                <div className="space-y-2">
                  {bloqueios.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="text-sm">
                        <div className="font-medium">{dayjs(b.data).format("DD/MM/YYYY")}</div>
                        <div className="text-xs text-slate-500">{b.inicio} — {b.fim}</div>
                      </div>
                      <div>
                        <Button size="sm" variant="outline" onClick={() => handleRemoverBloqueio(b.id)}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right: user + quick info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white rounded-lg border">
                <User size={18} />
              </div>
              <div>
                <h4 className="font-semibold">Conta</h4>
                <p className="text-xs text-slate-500">Informações do usuário conectado.</p>
              </div>
            </div>

            <div className="text-sm space-y-2">
              <div>
                <div className="text-xs text-slate-400">Nome</div>
                <div className="font-medium">{userName ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Email</div>
                <div className="font-medium">{userEmail ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white rounded-lg border">
                <CalendarRange size={18} />
              </div>
              <div>
                <h4 className="font-semibold">Informações rápidas</h4>
                <p className="text-xs text-slate-500">Resumo das configurações.</p>
              </div>
            </div>

            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">Horário</div>
                <div className="font-medium">{horarios.abertura} — {horarios.fechamento}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">Slot mínimo</div>
                <div className="font-medium">{SLOT_MINIMO} min</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">Bloqueios</div>
                <div className="font-medium">{bloqueios.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal adicionar bloqueio */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && fecharModalBloqueio()}>
        <DialogContent className="max-w-md w-full bg-white rounded-2xl border shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Adicionar bloqueio</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Defina o período que ficará indisponível para agendamentos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Data</Label>
              <Input className="w-full" type="date" value={blkData} onChange={(e) => setBlkData(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input className="w-full" type="time" value={blkInicio} onChange={(e) => setBlkInicio(e.target.value)} />
              </div>

              <div>
                <Label>Fim</Label>
                <Input className="w-full" type="time" value={blkFim} onChange={(e) => setBlkFim(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={fecharModalBloqueio}>Cancelar</Button>
            <Button className={`${PRIMARY} ${PRIMARY_TEXT}`} onClick={handleAdicionarBloqueio}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

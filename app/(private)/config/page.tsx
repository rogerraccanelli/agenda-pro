"use client";

import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import dayjs from "dayjs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Clock, CalendarRange, Ban, User } from "lucide-react";

type Bloqueio = {
  id: string;
  data: string;
  inicio: string;
  fim: string;
};

type ConfigDoc = {
  estabelecimentoNome?: string;
  horarios?: { abertura?: string; fechamento?: string };
  slotMinimo?: number;
  bloqueios?: Bloqueio[];
  updatedAt?: any;
};

export default function ConfigPage() {
  const [userLoaded, setUserLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [estabelecimentoNome, setEstabelecimentoNome] = useState("");
  const [horarios, setHorarios] = useState({
    abertura: "08:00",
    fechamento: "20:00",
  });
  const SLOT_MINIMO = 30;
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [blkData, setBlkData] = useState(dayjs().format("YYYY-MM-DD"));
  const [blkInicio, setBlkInicio] = useState("13:00");
  const [blkFim, setBlkFim] = useState("14:00");

  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const ref = doc(db, "users", auth.currentUser.uid, "config", "settings");

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as ConfigDoc;
        setEstabelecimentoNome(d.estabelecimentoNome || "");
        setHorarios({
          abertura: d.horarios?.abertura || "08:00",
          fechamento: d.horarios?.fechamento || "20:00",
        });
        setBloqueios(d.bloqueios || []);
      }
      setLoadingConfig(false);
    });

    return () => unsub();
  }, [userLoaded]);

  function gerarId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function adicionarBloqueio() {
    if (!blkData || !blkInicio || !blkFim) return;
    setBloqueios((prev) =>
      [...prev, { id: gerarId(), data: blkData, inicio: blkInicio, fim: blkFim }]
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
    );
    setModalOpen(false);
  }

  function removerBloqueio(id: string) {
    if (!confirm("Remover bloqueio?")) return;
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
  }

  async function salvarTudo() {
    if (!auth.currentUser) return;
    try {
      setSaving(true);
      await setDoc(
        doc(db, "users", auth.currentUser.uid, "config", "settings"),
        {
          estabelecimentoNome: estabelecimentoNome.trim(),
          horarios,
          slotMinimo: SLOT_MINIMO,
          bloqueios,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      alert("Configurações salvas.");
    } finally {
      setSaving(false);
    }
  }

  const PRIMARY = "bg-[#6D28D9] hover:bg-[#5B21B6]";
  const PRIMARY_TEXT = "text-white";

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 text-white rounded-xl">
            <Building size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Configurações</h1>
            <p className="text-sm text-slate-500">
              Ajustes do estúdio e agenda
            </p>
          </div>
        </div>

        <Button
          className={`w-full sm:w-auto ${PRIMARY} ${PRIMARY_TEXT}`}
          onClick={salvarTudo}
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Estabelecimento */}
          <div className="bg-white rounded-3xl border p-5">
            <Label>Nome do estabelecimento</Label>
            <Input
              className="w-full mt-2"
              value={estabelecimentoNome}
              onChange={(e) => setEstabelecimentoNome(e.target.value)}
            />
          </div>

          {/* Horários */}
          <div className="bg-white rounded-3xl border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} />
              <h3 className="font-semibold">Horário de funcionamento</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Abertura</Label>
                <Input
                  type="time"
                  className="w-full min-w-0 appearance-none overflow-hidden"
                  value={horarios.abertura}
                  onChange={(e) =>
                    setHorarios((s) => ({ ...s, abertura: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Fechamento</Label>
                <Input
                  type="time"
                  className="w-full min-w-0 appearance-none overflow-hidden"
                  value={horarios.fechamento}
                  onChange={(e) =>
                    setHorarios((s) => ({ ...s, fechamento: e.target.value }))
                  }
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Slot mínimo: <b>{SLOT_MINIMO} min</b>
            </p>
          </div>

          {/* Bloqueios */}
          <div className="bg-white rounded-3xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Bloqueios</h3>
              <Button onClick={() => setModalOpen(true)}>Adicionar</Button>
            </div>

            {bloqueios.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum bloqueio.</p>
            ) : (
              <div className="space-y-2">
                {bloqueios.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border rounded-xl p-3"
                  >
                    <div>
                      <div className="font-medium">
                        {dayjs(b.data).format("DD/MM/YYYY")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {b.inicio} — {b.fim}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removerBloqueio(b.id)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conta */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border p-5">
            <h4 className="font-semibold mb-3">Conta</h4>
            <div className="text-sm space-y-2">
              <div>
                <div className="text-xs text-slate-400">Nome</div>
                <div>{userName ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Email</div>
                <div>{userEmail ?? "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal bloqueio */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Novo bloqueio</DialogTitle>
            <DialogDescription>
              Defina um período indisponível
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Input type="date" value={blkData} onChange={(e) => setBlkData(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" value={blkInicio} onChange={(e) => setBlkInicio(e.target.value)} />
              <Input type="time" value={blkFim} onChange={(e) => setBlkFim(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className={`${PRIMARY} ${PRIMARY_TEXT}`} onClick={adicionarBloqueio}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

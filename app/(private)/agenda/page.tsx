// app/(private)/agenda/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  getDoc,
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type Appointment = {
  id: string;
  nome: string;
  telefone?: string;
  servicoId?: string;
  servicoNome?: string;
  duracao?: number; // minutos
  data: Date;
  time: string; // "HH:mm"
  endTime?: string;
  concluido?: boolean;
  concluidoAt?: any;
};

type Service = {
  id: string;
  nome?: string;
  duracao?: number; // minutos
  preco?: number; // number in reais or centavos depending on user data
  [k: string]: any;
};

const DURACOES = [
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
];

function gerarSlots(): string[] {
  const slots: string[] = [];
  let hora = 8;
  let minuto = 0;
  while (hora < 20 || (hora === 20 && minuto === 0)) {
    slots.push(`${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`);
    minuto += 30;
    if (minuto >= 60) {
      minuto = 0;
      hora += 1;
    }
    if (hora > 20) break;
  }
  return slots;
}

function formatServiceLabel(s: Service) {
  const dur = s.duracao ? ` • ${Math.floor(s.duracao / 60)}h${s.duracao % 60 ? `${s.duracao % 60}` : ""}` : "";
  const preco =
    typeof s.preco === "number"
      ? ` • R$ ${Number(s.preco).toFixed(2).replace(".", ",")}`
      : "";
  return `${s.nome || s.title || s.id}${dur}${preco}`;
}

export default function AgendaPage() {
  const [userLoaded, setUserLoaded] = useState(false);

  const [selectedDay, setSelectedDay] = useState(dayjs().format("YYYY-MM-DD"));
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // modal/form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servicoId, setServicoId] = useState<string | undefined>();
  const [duracao, setDuracao] = useState<number | undefined>();

  // edit state
  const [editando, setEditando] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState<Appointment | null>(null);

  // loading feedback (small)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => setUserLoaded(true));
    return () => unsub();
  }, []);

  // load services (ordered by nome)
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, "users", uid, "services"), orderBy("nome"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Service[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setServices(list);
    });
    return () => unsub();
  }, [userLoaded]);

  // load appointments for the selected day
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const start = new Date(selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(23, 59, 59, 999);

    const qAppts = query(
      collection(db, "users", uid, "appointments"),
      where("data", ">=", start),
      where("data", "<=", end),
      orderBy("data", "asc")
    );

    const unsubscribe = onSnapshot(qAppts, (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        const dataDoc: any = docSnap.data();
        const rawData = dataDoc.data;
        const dataNorm = rawData?.toDate ? rawData.toDate() : new Date(rawData);
        list.push({
          id: docSnap.id,
          nome: dataDoc.nome,
          telefone: dataDoc.telefone,
          servicoId: dataDoc.servicoId,
          servicoNome: dataDoc.servicoNome,
          duracao: dataDoc.duracao,
          data: dataNorm,
          time: dataDoc.time || dayjs(dataNorm).format("HH:mm"),
          endTime: dataDoc.endTime || undefined,
          concluido: dataDoc.concluido || false,
          concluidoAt: dataDoc.concluidoAt || null,
        });
      });
      setAgendamentos(list);
    });

    return () => unsubscribe();
  }, [selectedDay, userLoaded]);

  const agendamentosPorHorario = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const ag of agendamentos) {
      if (!map[ag.time]) map[ag.time] = [];
      map[ag.time].push(ag);
    }
    return map;
  }, [agendamentos]);

  const slots = useMemo(gerarSlots, []);

  // open create modal
  function abrirModal(h: string) {
    setEditando(false);
    setAgendamentoEditando(null);
    setSlotSelecionado(h);
    setNome("");
    setTelefone("");
    setServicoId(undefined);
    setDuracao(undefined);
    setDialogOpen(true);
  }

  // open edit modal
  function abrirModalEdicao(appt: Appointment) {
    setEditando(true);
    setAgendamentoEditando(appt);
    setSlotSelecionado(appt.time);
    setNome(appt.nome || "");
    setTelefone(appt.telefone || "");
    setServicoId(appt.servicoId);
    setDuracao(appt.duracao);
    setDialogOpen(true);
  }

  function fecharModal() {
    setDialogOpen(false);
    setSlotSelecionado(null);
    setNome("");
    setTelefone("");
    setServicoId(undefined);
    setDuracao(undefined);
    setEditando(false);
    setAgendamentoEditando(null);
    setSaving(false);
  }

  // create appointment
  async function handleCriarAgendamento() {
    if (!slotSelecionado) return;
    if (!nome.trim()) return alert("Informe o nome.");
    if (!telefone.trim()) return alert("Informe o telefone.");
    if (!servicoId) return alert("Escolha um serviço.");
    if (!duracao) return alert("Escolha a duração.");
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;

    // calcular início e fim
    const [hStr, mStr] = slotSelecionado.split(":");
    const h = Number(hStr);
    const m = Number(mStr);

    const start = new Date(selectedDay);
    start.setHours(h, m, 0, 0);

    const end = new Date(start.getTime() + duracao * 60000);

    // validar sobreposição
    const conflito = agendamentos.some((ag) => {
      const agStart = new Date(ag.data);
      const [eh, em] = ag.time.split(":").map(Number);
      agStart.setHours(eh, em, 0, 0);
      const agEnd = new Date(agStart.getTime() + (ag.duracao ?? 0) * 60000);
      return agStart < end && agEnd > start;
    });

    if (conflito) {
      return alert("Horário indisponível. Já existe outro agendamento.");
    }

    const servicoObj = services.find((s) => s.id === servicoId);
    const servicoNome =
      servicoObj?.nome ||
      servicoObj?.name ||
      servicoObj?.title ||
      servicoObj?.descricao ||
      servicoId;

    const endTime = dayjs(end).format("HH:mm");

    try {
      setSaving(true);

      await addDoc(collection(db, "users", uid, "appointments"), {
        nome: nome.trim(),
        telefone: telefone.trim(),
        servicoId,
        servicoNome,
        duracao,
        data: start,
        time: slotSelecionado,
        endTime,
        createdAt: new Date(),
        concluido: false,
      });

      fecharModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
      setSaving(false);
    }
  }

  // save edit
  async function handleSalvarEdicao() {
    if (!agendamentoEditando) return;
    if (!auth.currentUser) return;
    if (agendamentoEditando.concluido) return alert("Não é possível editar um agendamento concluído.");
    if (!nome.trim()) return alert("Informe o nome.");
    if (!telefone.trim()) return alert("Informe o telefone.");
    if (!servicoId) return alert("Escolha um serviço.");
    if (!duracao) return alert("Escolha a duração.");

    try {
      setSaving(true);
      const uid = auth.currentUser.uid;
      const apptRef = doc(db, "users", uid, "appointments", agendamentoEditando.id);

      const timeToUse = slotSelecionado || agendamentoEditando.time;
      const [hStr, mStr] = timeToUse.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      const data = new Date(selectedDay);
      data.setHours(h, m, 0, 0);

      const endTimeDate = new Date(data.getTime() + duracao * 60000);
      const endTime = dayjs(endTimeDate).format("HH:mm");

      const servicoObj = services.find((s) => s.id === servicoId);
      const servicoNome =
        servicoObj?.nome || servicoObj?.name || servicoObj?.title || servicoId;

      await updateDoc(apptRef, {
        nome: nome.trim(),
        telefone: telefone.trim(),
        servicoId,
        servicoNome,
        duracao,
        data,
        time: timeToUse,
        endTime,
        updatedAt: new Date(),
      });

      fecharModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar alterações.");
      setSaving(false);
    }
  }

  // delete
  async function excluirAgendamento(id: string) {
    if (!auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db, "users", uid, "appointments", id));
      if (agendamentoEditando?.id === id) fecharModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  }

  // delete from modal
  async function handleExcluirNoModal() {
    if (!agendamentoEditando) return;
    if (!confirm("Confirmar exclusão deste agendamento?")) return;
    await excluirAgendamento(agendamentoEditando.id);
  }

  // concluir atendimento -> busca preco do service, cria lancamento e marca concluido
  async function concluirAtendimento() {
    if (!agendamentoEditando || !auth.currentUser) return;
    if (agendamentoEditando.concluido) return;

    const uid = auth.currentUser.uid;
    if (!agendamentoEditando.servicoId) return alert("Serviço inválido.");

    const servRef = doc(db, "users", uid, "services", agendamentoEditando.servicoId);
    try {
      setSaving(true);
      const servSnap = await getDoc(servRef);
      if (!servSnap.exists()) {
        setSaving(false);
        return alert("Serviço não encontrado.");
      }

      const servData = servSnap.data() as Service;
      const preco = servData.preco;
      if (!preco || preco <= 0) {
        setSaving(false);
        return alert("Preço do serviço inválido.");
      }

      // criar lançamento financeiro
      await addDoc(collection(db, "users", uid, "finances"), {
        valor: preco,
        tipo: "entrada",
        categoria: "servico",
        appointmentId: agendamentoEditando.id,
        serviceId: agendamentoEditando.servicoId,
        clienteNome: agendamentoEditando.nome,
        createdAt: new Date(),
      });

      // marcar agendamento como concluido
      await updateDoc(doc(db, "users", uid, "appointments", agendamentoEditando.id), {
        concluido: true,
        concluidoAt: new Date(),
      });

      fecharModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao concluir atendimento.");
      setSaving(false);
    }
  }

  function mudarDia(qtd: number) {
    setSelectedDay(dayjs(selectedDay).add(qtd, "day").format("YYYY-MM-DD"));
  }

  const PRIMARY = "bg-[#6D28D9] hover:bg-[#5B21B6]";
  const PRIMARY_TEXT = "text-white";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold text-slate-900 dark:text-white">Agenda</h1>
          <p className="text-sm text-slate-500">Clique em um horário para criar um agendamento.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button className="rounded-md" variant="outline" onClick={() => mudarDia(-1)}>
            ◀ Anterior
          </Button>

          <Button className={`rounded-md ${PRIMARY} ${PRIMARY_TEXT}`} onClick={() => setSelectedDay(dayjs().format("YYYY-MM-DD"))}>
            Hoje
          </Button>

          <Button className="rounded-md" variant="outline" onClick={() => mudarDia(1)}>
            Próximo ▶
          </Button>

          {/* date picker quick (native) */}
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="ml-3 p-2 border rounded-md text-sm"
          />
        </div>
      </div>

      <p className="text-sm">
        Dia selecionado: <span className="font-semibold">{dayjs(selectedDay).format("DD/MM/YYYY")}</span>
      </p>

      {/* grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => {
          const lista = agendamentosPorHorario[slot] || [];
          const ocupado = lista.length > 0;
          const agendamento = ocupado ? lista[0] : null;

          const isNow =
            dayjs().isSame(dayjs(`${selectedDay}T${slot}:00`), "hour") &&
            dayjs().isSame(dayjs(`${selectedDay}T${slot}:00`), "day");

          return (
            <div
              key={slot}
              onClick={() => {
                if (ocupado && agendamento) abrirModalEdicao(agendamento);
                else abrirModal(slot);
              }}
              role="button"
              className={`group rounded-3xl border transition-all transform motion-safe:duration-200 motion-safe:ease-out p-4 flex flex-col justify-between cursor-pointer
                ${ocupado ? (agendamento?.concluido ? "bg-green-50 border-green-100 hover:shadow-lg" : "bg-purple-50 border-purple-100 hover:shadow-lg") : "bg-white hover:shadow-lg"}
                ${isNow ? "ring-2 ring-[#6D28D9]/20" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-semibold text-slate-800">{slot}</span>

                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    ocupado
                      ? agendamento?.concluido
                        ? "bg-green-100 text-green-700"
                        : "bg-[#EDE9FE] text-[#5B21B6]"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ocupado ? (agendamento?.concluido ? "Concluído" : "Agendado") : "Livre"}
                </span>
              </div>

              <div className="space-y-1">
                {ocupado ? (
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{agendamento?.nome}</span>
                    {agendamento?.servicoNome && <span className="text-xs text-slate-500">{agendamento.servicoNome}</span>}
                    {agendamento?.duracao && <span className="text-xs text-slate-400">{`${agendamento.duracao} min`}</span>}
                    {agendamento?.concluidoAt && (
                      <span className="text-xs text-green-700">
                        Concluído às {typeof agendamento.concluidoAt?.toDate === "function" ? dayjs(agendamento.concluidoAt.toDate()).format("HH:mm") : dayjs(agendamento.concluidoAt).format("HH:mm")}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Nenhum agendamento neste horário.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* modal */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && fecharModal()}>
        <DialogContent
          className="
           modal-fix
           w-full
           max-w-lg
           bg-white
           rounded-2xl
           border
           shadow-2xl
           p-6
           max-h-[90vh]
           overflow-y-auto"
        >


          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{editando ? "Agendamento" : "Criar agendamento"}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editando ? (agendamentoEditando?.concluido ? "Este atendimento já foi concluído." : "Atualize as informações abaixo.") : "Preencha os dados para agendar neste horário."}
            </DialogDescription>
          </DialogHeader>

          {/* Somente leitura se concluído */}
          {editando && agendamentoEditando?.concluido ? (
            <div className="space-y-4 mt-4 text-sm">
              <p><b>Cliente:</b> {agendamentoEditando.nome}</p>
              <p><b>Telefone:</b> {agendamentoEditando.telefone}</p>
              <p><b>Serviço:</b> {agendamentoEditando.servicoNome}</p>
              <p><b>Duração:</b> {agendamentoEditando.duracao} min</p>
              <p>
                <b>Concluído em:</b>{" "}
                {agendamentoEditando.concluidoAt ? (typeof agendamentoEditando.concluidoAt?.toDate === "function" ? dayjs(agendamentoEditando.concluidoAt.toDate()).format("DD/MM/YYYY HH:mm") : dayjs(agendamentoEditando.concluidoAt).format("DD/MM/YYYY HH:mm")) : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <p className="text-sm">
                Dia <span className="font-semibold">{dayjs(selectedDay).format("DD/MM/YYYY")}</span> às <span className="font-semibold">{slotSelecionado}</span>
              </p>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" className="w-full" placeholder="Nome da cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" className="w-full" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={servicoId} onValueChange={(v) => setServicoId(v === "__none" ? undefined : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={services.length ? "Selecione um serviço" : "Nenhum serviço cadastrado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length === 0 ? (
                      <SelectItem value="__none" disabled>Nenhum serviço cadastrado</SelectItem>
                    ) : (
                      services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{formatServiceLabel(s)}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <Select value={duracao ? String(duracao) : undefined} onValueChange={(v) => setDuracao(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURACOES.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap gap-2 justify-end">
            {editando && !agendamentoEditando?.concluido && (
              <Button variant="destructive" onClick={handleExcluirNoModal}>Excluir</Button>
            )}

            <Button variant="outline" onClick={fecharModal}>Fechar</Button>

            {editando && !agendamentoEditando?.concluido && (
              <Button className={`${PRIMARY} ${PRIMARY_TEXT}`} onClick={concluirAtendimento}>Concluir atendimento</Button>
            )}

            {!agendamentoEditando?.concluido && (
              <>
                {editando ? (
                  <Button className={`${PRIMARY} ${PRIMARY_TEXT}`} onClick={handleSalvarEdicao}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
                ) : (
                  <Button className={`${PRIMARY} ${PRIMARY_TEXT}`} onClick={handleCriarAgendamento}>{saving ? "Salvando..." : "Salvar agendamento"}</Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

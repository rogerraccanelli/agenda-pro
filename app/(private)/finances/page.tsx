// app/(private)/finances/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
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

type Lancamento = {
  id: string;
  valor: number;
  tipo: "entrada" | "saida";
  categoria: string;
  observacao?: string;
  createdAt: any;
};

const CATEGORIAS = ["servico", "produto", "quimica", "unha"];

export default function FinancesPage() {
  const [userLoaded, setUserLoaded] = useState(false);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [dataFiltro, setDataFiltro] = useState("");

  // modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [valorStr, setValorStr] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [categoria, setCategoria] = useState("servico");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => setUserLoaded(true));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const q = query(
      collection(db, "users", uid, "finances"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Lancamento[] = [];
      snap.forEach((d) =>
        list.push({ id: d.id, ...(d.data() as any) })
      );
      setLancamentos(list);
    });

    return () => unsub();
  }, [userLoaded]);

  const filtrados = useMemo(() => {
    if (!dataFiltro) return lancamentos;
    return lancamentos.filter(
      (l) => dayjs(l.createdAt.toDate()).format("YYYY-MM-DD") === dataFiltro
    );
  }, [lancamentos, dataFiltro]);

  const totalDia = useMemo(() => {
    const hoje = dayjs().format("YYYY-MM-DD");
    return lancamentos
      .filter((l) => dayjs(l.createdAt.toDate()).format("YYYY-MM-DD") === hoje)
      .reduce(
        (acc, cur) => acc + (cur.tipo === "entrada" ? cur.valor : -cur.valor),
        0
      );
  }, [lancamentos]);

  const totalMes = useMemo(() => {
    const mes = dayjs().format("YYYY-MM");
    return lancamentos
      .filter((l) => dayjs(l.createdAt.toDate()).format("YYYY-MM") === mes)
      .reduce(
        (acc, cur) => acc + (cur.tipo === "entrada" ? cur.valor : -cur.valor),
        0
      );
  }, [lancamentos]);

  const totalAno = useMemo(() => {
    const ano = dayjs().format("YYYY");
    return lancamentos
      .filter((l) => dayjs(l.createdAt.toDate()).format("YYYY") === ano)
      .reduce(
        (acc, cur) => acc + (cur.tipo === "entrada" ? cur.valor : -cur.valor),
        0
      );
  }, [lancamentos]);

  function abrirModal() {
    setValorStr("");
    setTipo("entrada");
    setCategoria("servico");
    setObservacao("");
    setDialogOpen(true);
  }

  function fecharModal() {
    setDialogOpen(false);
    setSaving(false);
  }

  function parseValor(str: string): number {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  async function criarLancamentoManual() {
    const valor = parseValor(valorStr);
    if (!Number.isFinite(valor) || valor <= 0)
      return alert("Informe um valor válido.");
    if (!auth.currentUser) return;

    try {
      setSaving(true);
      const uid = auth.currentUser.uid;

      await addDoc(collection(db, "users", uid, "finances"), {
        valor,
        tipo,
        categoria,
        observacao: observacao.trim(),
        createdAt: new Date(),
      });

      fecharModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar lançamento.");
      setSaving(false);
    }
  }

  async function excluirLancamento(id: string) {
    if (!confirm("Excluir lançamento?")) return;
    if (!auth.currentUser) return;

    try {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db, "users", uid, "finances", id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  }

  const PRIMARY = "bg-[#6D28D9] hover:bg-[#5B21B6]";
  const PRIMARY_TEXT = "text-white";

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[30px] font-extrabold text-slate-900">
            Financeiro
          </h1>
          <p className="text-sm text-slate-500">
            Resumo financeiro e lançamentos.
          </p>
        </div>

        <Button className={`${PRIMARY} ${PRIMARY_TEXT}`} onClick={abrirModal}>
          Novo Lançamento
        </Button>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total do dia", value: totalDia },
          { label: "Total do mês", value: totalMes },
          { label: "Total do ano", value: totalAno },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-2xl border p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-xl font-bold break-all">
              R$ {item.value.toFixed(2).replace(".", ",")}
            </p>
          </div>
        ))}
      </div>

      {/* FILTRO */}
      <div className="space-y-1 max-w-xs">
        <Label>Filtrar por data</Label>
        <Input
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
          className="w-full"
        />
      </div>

      {/* LISTA */}
      <div className="space-y-3 md:hidden">
        {filtrados.map((l) => {
          const dt = dayjs(l.createdAt.toDate()).format("DD/MM HH:mm");
          const val = l.valor.toFixed(2).replace(".", ",");

          return (
            <div
              key={l.id}
              className="bg-white rounded-2xl border p-4 shadow-sm space-y-1"
            >
              <div className="flex justify-between text-sm">
                <span>{dt}</span>
                <span className="capitalize">{l.categoria}</span>
              </div>

              <div className="font-semibold">
                {l.tipo === "saida" ? (
                  <span className="text-red-600">- R$ {val}</span>
                ) : (
                  <span className="text-green-600">R$ {val}</span>
                )}
              </div>

              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => excluirLancamento(l.id)}
              >
                Excluir
              </Button>
            </div>
          );
        })}
      </div>

      {/* TABELA DESKTOP */}
      <div className="hidden md:block bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Categoria</th>
              <th className="p-3 text-left">Valor</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => {
              const dt = dayjs(l.createdAt.toDate()).format("DD/MM HH:mm");
              const val = l.valor.toFixed(2).replace(".", ",");

              return (
                <tr key={l.id} className="border-b">
                  <td className="p-3">{dt}</td>
                  <td className="p-3 capitalize">{l.tipo}</td>
                  <td className="p-3 capitalize">{l.categoria}</td>
                  <td className="p-3 font-semibold">
                    {l.tipo === "saida" ? (
                      <span className="text-red-600">- R$ {val}</span>
                    ) : (
                      <span className="text-green-600">R$ {val}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => excluirLancamento(l.id)}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && fecharModal()}>
        <DialogContent className="max-w-md w-full rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>
              Preencha os dados do lançamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Valor</Label>
              <Input
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                placeholder="Ex: 80,00"
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <select
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as "entrada" | "saida")
                }
                className="w-full border rounded-md p-2"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div>
              <Label>Categoria</Label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Observação</Label>
              <Input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button
              onClick={criarLancamentoManual}
              className={`${PRIMARY} ${PRIMARY_TEXT}`}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

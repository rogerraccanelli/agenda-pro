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
  where,
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

  // carregar lançamentos
  useEffect(() => {
    if (!userLoaded || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    let qBase = query(
      collection(db, "users", uid, "finances"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(qBase, (snap) => {
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
    return lancamentos.filter((l) =>
      dayjs(l.createdAt.toDate()).format("YYYY-MM-DD") === dataFiltro
    );
  }, [lancamentos, dataFiltro]);

  // dashboard
  const totalDia = useMemo(() => {
    const hoje = dayjs().format("YYYY-MM-DD");
    return lancamentos
      .filter((l) => dayjs(l.createdAt.toDate()).format("YYYY-MM-DD") === hoje)
      .reduce((acc, cur) => acc + (cur.tipo === "entrada" ? cur.valor : -cur.valor), 0);
  }, [lancamentos]);

  const totalMes = useMemo(() => {
    const mes = dayjs().format("YYYY-MM");
    return lancamentos
      .filter((l) => dayjs(l.createdAt.toDate()).format("YYYY-MM") === mes)
      .reduce((acc, cur) => acc + (cur.tipo === "entrada" ? cur.valor : -cur.valor), 0);
  }, [lancamentos]);

  const totalAno = useMemo(() => {
    const ano = dayjs().format("YYYY");
    return lancamentos
      .filter((l) => dayjs(l.createdAt.toDate()).format("YYYY") === ano)
      .reduce((acc, cur) => acc + (cur.tipo === "entrada" ? cur.valor : -cur.valor), 0);
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
    <div className="p-4 md:p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold text-slate-900">Financeiro</h1>
          <p className="text-sm text-slate-500">Resumo financeiro e lançamentos.</p>
        </div>

        <Button className={`rounded-md ${PRIMARY} ${PRIMARY_TEXT}`} onClick={abrirModal}>
          Novo Lançamento
        </Button>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total do dia</p>
          <p className="text-xl font-bold">
            R$ {totalDia.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total do mês</p>
          <p className="text-xl font-bold">
            R$ {totalMes.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total do ano</p>
          <p className="text-xl font-bold">
            R$ {totalAno.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      {/* FILTRO */}
      <div>
        <Label>Filtrar por data</Label>
        <Input
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
          className="w-48 mt-1"
        />
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
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
                  <td className="p-3">
                    {l.tipo === "saida" ? (
                      <span className="text-red-600 font-semibold">- R$ {val}</span>
                    ) : (
                      <span className="text-green-600 font-semibold">R$ {val}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-red-600 text-white rounded-md"
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
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && fecharModal()}>
        <DialogContent className="max-w-md w-full rounded-2xl border p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Novo lançamento
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para registrar o movimento financeiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                placeholder="Ex: 80,00"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as "entrada" | "saida")
                }
                className="border rounded-md p-2"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="border rounded-md p-2"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Input
                placeholder="Opcional"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <Button variant="outline" onClick={fecharModal}>
              Cancelar
            </Button>

            <Button
              onClick={criarLancamentoManual}
              className={`${PRIMARY} ${PRIMARY_TEXT} rounded-md ${
                saving ? "opacity-70 pointer-events-none" : ""
              }`}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

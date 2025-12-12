"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Scissors, Plus, Edit2, Trash2 } from "lucide-react";

type Service = {
  id: string;
  nome: string;
  duracao?: number;
  preco?: number;
  [k: string]: any;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<null | Service>(null);
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState<number | undefined>(30);
  const [preco, setPreco] = useState<number | undefined>(90);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setServices([]);
        setLoading(false);
      }
    });

    if (!auth.currentUser) {
      setLoading(false);
      return () => unsubAuth();
    }

    const uid = auth.currentUser.uid;
    const q = query(collection(db, "users", uid, "services"), orderBy("nome"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Service[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setServices(list);
      setLoading(false);
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  function abrirCriar() {
    setEditando(null);
    setNome("");
    setDuracao(30);
    setPreco(90);
    setDialogOpen(true);
  }

  function abrirEditar(s: Service) {
    setEditando(s);
    setNome(s.nome || "");
    setDuracao(s.duracao || 30);
    setPreco(typeof s.preco === "number" ? s.preco : 90);
    setDialogOpen(true);
  }

  async function handleSalvar() {
    if (!auth.currentUser) return alert("Usuário não autenticado.");
    if (!nome.trim()) return alert("Informe o nome do serviço.");
    const uid = auth.currentUser.uid;

    const payload = {
      nome: nome.trim(),
      duracao: duracao ?? 30,
      preco: preco ?? 0,
      updatedAt: new Date(),
    };

    try {
      if (editando) {
        await updateDoc(doc(db, "users", uid, "services", editando.id), payload);
      } else {
        await addDoc(collection(db, "users", uid, "services"), {
          ...payload,
          createdAt: new Date(),
        });
      }
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar serviço.");
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Confirmar exclusão deste serviço?")) return;
    if (!auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db, "users", uid, "services", id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Serviços</h1>
          <p className="text-sm text-slate-500">Gerencie os serviços do Studio RGS.</p>
        </div>

        <div>
          <Button onClick={abrirCriar} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Novo serviço
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Carregando...</div>
      ) : services.length === 0 ? (
        <div className="card">Nenhum serviço cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="card">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-[#F3E8FF] text-[#6D28D9] w-9 h-9 flex items-center justify-center">
                      <Scissors size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{s.nome}</h2>
                  </div>
                  <p className="small-muted mt-2">Duração: {s.duracao ?? 0} min</p>
                </div>

                <div className="text-right">
                  <div className="text-violet-700 font-bold text-lg">
                    R$ {(Number(s.preco ?? 0)).toFixed(2).replace(".", ",")}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => abrirEditar(s)}
                  className="btn-outline flex-1 flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  Editar
                </button>

                <button
                  onClick={() => handleExcluir(s.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar / editar */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent className="w-full max-w-lg bg-white rounded-2xl p-6 modal-fix max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              {editando ? "Altere os dados e salve." : "Preencha os dados do serviço."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="dur">Duração (min)</Label>
                <Input
                  id="dur"
                  type="number"
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  value={preco}
                  onChange={(e) => setPreco(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="btn-primary" onClick={handleSalvar}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

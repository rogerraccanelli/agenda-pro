"use client";

import { useEffect, useMemo, useState } from "react";
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
import { UserPlus, User, Edit2, Trash2, Search } from "lucide-react";
import dayjs from "dayjs";

type Client = {
  id: string;
  nome: string;
  telefone?: string;
  ultimaVisita?: any;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // busca
  const [search, setSearch] = useState("");

  // modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<null | Client>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setClients([]);
        setLoading(false);
      }
    });

    if (!auth.currentUser) {
      setLoading(false);
      return () => unsubAuth();
    }

    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "users", uid, "clientes"),
      orderBy("nome")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Client[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setClients(list);
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
    setTelefone("");
    setDialogOpen(true);
  }

  function abrirEditar(c: Client) {
    setEditando(c);
    setNome(c.nome || "");
    setTelefone(c.telefone || "");
    setDialogOpen(true);
  }

  async function handleSalvar() {
    if (!auth.currentUser) return alert("Usuário não autenticado.");
    if (!nome.trim()) return alert("Informe o nome.");

    const uid = auth.currentUser.uid;

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      updatedAt: new Date(),
    };

    try {
      if (editando) {
        await updateDoc(
          doc(db, "users", uid, "clientes", editando.id),
          payload
        );
      } else {
        await addDoc(
          collection(db, "users", uid, "clientes"),
          {
            ...payload,
            criadoEm: new Date(),
          }
        );
      }

      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente.");
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Confirmar exclusão deste cliente?")) return;
    if (!auth.currentUser) return;

    try {
      const uid = auth.currentUser.uid;
      await deleteDoc(doc(db, "users", uid, "clientes", id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  }

  // clientes filtrados (busca por nome)
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    return clients.filter((c) =>
      (c.nome || "").toLowerCase().includes(term)
    );
  }, [clients, search]);

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">
            Lista de clientes do Studio RGS.
          </p>
        </div>

        <Button onClick={abrirCriar} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          Novo cliente
        </Button>
      </div>

      {/* BUSCA */}
      <div className="relative max-w-md">
        {!search && (
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}

        <Input
          type="text"
          placeholder="Buscar cliente pelo nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={search ? "pl-3" : "pl-11"}
        />
      </div>


      {loading ? (
        <div className="text-sm text-slate-500">Carregando...</div>
      ) : filteredClients.length === 0 ? (
        <div className="card">
          {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((c) => (
            <div key={c.id} className="card">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#F3E8FF] text-[#6D28D9] w-9 h-9 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {c.nome}
                    </h2>
                  </div>

                  <p className="small-muted mt-2">{c.telefone || "—"}</p>

                  <p className="text-xs text-slate-400 mt-2">
                    Último atendimento:{" "}
                    {c.ultimaVisita
                      ? typeof c.ultimaVisita?.toDate === "function"
                        ? dayjs(c.ultimaVisita.toDate()).format("DD/MM/YYYY")
                        : dayjs(c.ultimaVisita).format("DD/MM/YYYY")
                      : "Nenhum"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => abrirEditar(c)}
                  className="btn-outline flex-1 flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  Editar
                </button>

                <button
                  onClick={() => handleExcluir(c.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent className="w-full max-w-lg bg-white rounded-2xl p-6 modal-fix max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "Altere os dados e salve."
                : "Preencha os dados do cliente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="btn-primary" onClick={handleSalvar}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

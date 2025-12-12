"use client"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/src/lib/firebase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro("")

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, senha)
      const token = await userCred.user.getIdToken()

      // Criar cookie
      document.cookie = `firebase-auth=${token}; path=/; max-age=86400`

      router.push("/agenda")
    } catch (error: any) {
      setErro("Email ou senha inválidos")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded p-6 w-full max-w-sm"
      >
        <h1 className="text-xl font-bold mb-4">Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="border p-2 w-full mb-3"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && <p className="text-red-500 text-sm mb-3">{erro}</p>}

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}

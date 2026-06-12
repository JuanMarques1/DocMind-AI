import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await register(email, senha);
      navigate("/");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setErro("Esse email já está cadastrado.");
      } else {
        setErro("Não foi possível criar a conta. Verifique os dados.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h3 style={{ margin: 0 }}>Criar conta</h3>
        {erro && <p className="alert" style={{ margin: 0 }}>{erro}</p>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input-group">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <div className="input-group">
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta"}
        </button>
        <p className="muted" style={{ fontSize: "var(--text-sm)", margin: 0 }}>
          Já tem conta? <Link to="/login" className="link">Entrar</Link>
        </p>
      </form>
    </div>
  );
}

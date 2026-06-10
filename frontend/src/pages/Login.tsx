import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
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
      await login(email, senha);
      navigate("/");
    } catch {
      setErro("Email ou senha inválidos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h3 style={{ margin: 0 }}>Entrar no DocMind</h3>
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
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        <p className="muted" style={{ fontSize: "var(--text-sm)", margin: 0 }}>
          Não tem conta? <Link to="/register" className="link">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}

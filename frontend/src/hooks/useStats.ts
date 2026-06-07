import { useEffect, useState } from "react";
import { getStats, type Stats } from "../services/api";

/** Carrega as estatísticas do dashboard. */
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setError("Não foi possível carregar as estatísticas."))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

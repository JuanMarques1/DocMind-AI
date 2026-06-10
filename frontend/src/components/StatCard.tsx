import { Icon, type IconName } from "./Icon";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
}

/** Cartão de métrica: rótulo, ícone e valor em fonte mono (estilo Vercel). */
export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="stat">
      <div className="top">
        <span className="label">{label}</span>
        <span className="ico">
          <Icon name={icon} />
        </span>
      </div>
      <span className="value">{value}</span>
    </div>
  );
}

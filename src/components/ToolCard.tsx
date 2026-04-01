import Link from 'next/link';

interface ToolCardProps {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function ToolCard({ title, description, href, disabled = false, onClick }: ToolCardProps) {
  const inner = (
    <div
      className={`bg-gray-800 p-6 rounded-xl border border-gray-700 transition ${
        disabled
          ? 'opacity-50'
          : 'hover:border-blue-500 cursor-pointer'
      }`}
      onClick={!disabled ? onClick : undefined}
    >
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );

  if (href && !disabled) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}

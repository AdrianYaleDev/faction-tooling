import { ReactNode } from 'react';

interface DashboardToolsProps {
  children: ReactNode;
}

export default function DashboardTools({ children }: DashboardToolsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {children}
    </section>
  );
}

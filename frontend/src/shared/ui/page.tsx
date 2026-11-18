import type { HTMLAttributes, ReactNode } from 'react';

export function Page({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto max-w-[1100px] p-4 ${className}`} {...props} />;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <h1 className="text-[22px] font-semibold">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

/** Contenido principal + columna lateral (chat). Una sola columna en pantallas chicas. */
export function SplitLayout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">{main}</div>
      {side}
    </div>
  );
}

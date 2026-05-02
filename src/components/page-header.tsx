import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * PageHeader — einheitlicher Seitentitel-Block für Dashboard und Tool-Seiten.
 */
export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className="text-2xl font-extrabold tracking-tight text-tx sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-sm text-mu sm:text-base">{description}</p>
      )}
    </div>
  );
}

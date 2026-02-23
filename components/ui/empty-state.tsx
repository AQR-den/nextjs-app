import Image from "next/image";
import clsx from "clsx";

export function EmptyState({
  title,
  description,
  image,
  className
}: {
  title: string;
  description: string;
  image: string;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_20px_40px_-30px_rgba(0,0,0,0.7)]", className)}>
      <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10">
        <Image src={image} alt={title} fill sizes="(max-width: 768px) 90vw, 420px" className="object-cover" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <Image src="/brand/tekkerz-icon.svg" width={34} height={34} alt="Tekkerz" priority />
  ) : (
    <Image src="/brand/tekkerz-logo.svg" width={170} height={36} alt="Tekkerz" priority />
  );
}

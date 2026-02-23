import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <div>
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you requested does not exist.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button>Back home</Button>
        </Link>
      </div>
    </div>
  );
}

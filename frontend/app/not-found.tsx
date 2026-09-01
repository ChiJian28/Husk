import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">That page is not in Husk</h1>
      <Link href="/" className="text-sm text-husk hover:underline">
        Back home
      </Link>
    </div>
  );
}

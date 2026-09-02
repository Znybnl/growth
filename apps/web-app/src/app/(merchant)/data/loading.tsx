import { LoadingSkeleton } from "@/components/ui/workspace";

export default function DataLoading() {
  return (
    <div className="space-y-6" aria-label="Chargement des résultats" role="status">
      <section className="space-y-5 px-1 py-2">
        <div className="space-y-3">
          <LoadingSkeleton className="h-3 w-32" />
          <LoadingSkeleton className="h-10 w-72" />
          <LoadingSkeleton className="h-4 w-full max-w-2xl" />
        </div>
        <LoadingSkeleton className="h-12 w-full max-w-xl" />
      </section>
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="okado-card h-32 bg-purple-haze" />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="okado-card h-72 bg-purple-haze" />
        ))}
      </section>
    </div>
  );
}

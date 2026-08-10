export default function DataLoading() {
  return (
    <div className="space-y-6" aria-label="Chargement des résultats" role="status">
      <section className="space-y-5 px-1 py-2">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded bg-[#e7edf5]" />
          <div className="h-10 w-72 animate-pulse rounded bg-[#e7edf5]" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-[#e7edf5]" />
        </div>
        <div className="h-12 w-full max-w-xl animate-pulse rounded-[14px] bg-[#e7edf5]" />
      </section>
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="okado-card h-32 animate-pulse bg-[#f5f8fc]" />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="okado-card h-72 animate-pulse bg-[#f5f8fc]" />
        ))}
      </section>
    </div>
  );
}

import { LoadingSkeleton } from "@/components/ui/workspace";

export function MerchantPageSkeleton() {
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="okado-card p-6 xl:p-8">
        <LoadingSkeleton className="h-3 w-36" />
        <LoadingSkeleton className="mt-5 h-10 w-full max-w-md" />
        <LoadingSkeleton className="mt-4 h-4 w-full max-w-2xl" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="okado-card p-5">
            <LoadingSkeleton className="h-3 w-28" />
            <LoadingSkeleton className="mt-5 h-8 w-20" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="okado-card min-h-[350px] p-6">
          <LoadingSkeleton className="h-3 w-44" />
          <LoadingSkeleton className="mt-4 h-8 w-72 max-w-full" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-16" />
            ))}
          </div>
        </div>

        <div className="okado-card min-h-[350px] p-6">
          <LoadingSkeleton className="h-3 w-36" />
          <LoadingSkeleton className="mt-4 h-8 w-56 max-w-full" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-20" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

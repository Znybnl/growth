import { LoadingSkeleton } from "@/components/ui/workspace";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-linen-canvas px-4 py-8 sm:px-6 lg:px-10 xl:px-12 xl:py-10">
      <div className="mx-auto w-full max-w-[760px]">
        <div className="mb-8 flex items-center gap-3">
          <LoadingSkeleton className="h-11 w-11 rounded-[4px]" />
          <div>
            <LoadingSkeleton className="h-6 w-24 rounded-[4px]" />
            <LoadingSkeleton className="mt-2 h-3 w-40 rounded-[4px]" />
          </div>
        </div>
        <section className="okado-card space-y-6 p-6 sm:p-8">
          <LoadingSkeleton className="h-3 w-24 rounded-[4px]" />
          <LoadingSkeleton className="h-10 w-full max-w-lg rounded-[4px]" />
          <LoadingSkeleton className="h-4 w-full max-w-2xl rounded-[4px]" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-14 rounded-[8px]" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

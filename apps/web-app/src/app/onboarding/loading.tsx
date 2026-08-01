export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-linen-canvas px-4 py-8 sm:px-6 lg:px-10 xl:px-12 xl:py-10">
      <div className="mx-auto w-full max-w-[760px]">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-[12px] bg-[#dfe8f6]" />
          <div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-[#dfe8f6]" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-[#e9eff8]" />
          </div>
        </div>
        <section className="okado-card space-y-6 p-6 sm:p-8">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[#e6ecf5]" />
          <div className="h-10 w-full max-w-lg animate-pulse rounded-full bg-[#e6ecf5]" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-[#eef3fb]" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-[12px] bg-[#f0f4fa]" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

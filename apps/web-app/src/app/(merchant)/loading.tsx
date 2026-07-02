export default function MerchantLoading() {
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="rounded-[34px] border border-[#dbe4f0] bg-white p-6 shadow-[0_20px_50px_rgba(122,136,166,0.14)] xl:p-8">
        <div className="h-3 w-36 animate-pulse rounded-full bg-[#e6ecf5]" />
        <div className="mt-5 h-10 w-full max-w-md animate-pulse rounded-full bg-[#e6ecf5]" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-[#eef3fb]" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_36px_rgba(122,136,166,0.08)]"
          >
            <div className="h-3 w-28 animate-pulse rounded-full bg-[#e6ecf5]" />
            <div className="mt-5 h-8 w-20 animate-pulse rounded-full bg-[#eef3fb]" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-h-[350px] rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
          <div className="h-3 w-44 animate-pulse rounded-full bg-[#e6ecf5]" />
          <div className="mt-4 h-8 w-72 max-w-full animate-pulse rounded-full bg-[#eef3fb]" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-[22px] bg-[#f4f7fb]" />
            ))}
          </div>
        </div>

        <div className="min-h-[350px] rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
          <div className="h-3 w-36 animate-pulse rounded-full bg-[#e6ecf5]" />
          <div className="mt-4 h-8 w-56 animate-pulse rounded-full bg-[#eef3fb]" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-[24px] bg-[#f4f7fb]" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

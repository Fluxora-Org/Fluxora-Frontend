interface HeroSectionProps {
  theme?: "light" | "dark";
}

export default function HeroSection({ theme = "light" }: HeroSectionProps) {
  const isDark = theme === "dark";

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden font-['Plus_Jakarta_Sans',system-ui,sans-serif]"
      style={{
        background: isDark
          ? "radial-gradient(ellipse 80% 60% at 60% 40%, #0f2a3a 0%, #0a0e17 70%, #060910 100%)"
          : "radial-gradient(ellipse 80% 60% at 60% 40%, #c8eaf5 0%, #dff0f7 40%, #f4f9fb 70%, #ffffff 100%)",
      }}
    >
      <div className="relative z-10 mx-auto md:px-20 px-6 py-16">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-center lg:gap-12">
          {/* ─── LEFT: Marketing Content ─── */}
          <div className="flex flex-1 flex-col gap-8">
            {/* Built on Stellar Tag */}
            <div className="flex items-center gap-2 self-start">
              <span
                className={`border border-[#00B8D4]/30
                  flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold
                  ${
                    isDark
                      ? "bg-slate-800 text-white ring-1 ring-slate-700"
                      : "bg-[#00B8D4]/5 text-black ring-1 ring-slate-200"
                  }
                `}
              >
                <span className="h-2 w-2 rounded-full bg-[#00B8D4] shadow-[0_0_6px_2px_rgba(56,189,248,0.5)]" />
                Built on Stellar
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-1">
              <h1
                className={`
                  text-5xl font-extrabold leading-tight tracking-tight lg:text-6xl
                  ${isDark ? "text-white" : "text-slate-900"}
                `}
              >
                Continuous
              </h1>
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-[#00b8d4] lg:text-6xl">
                treasury streaming
              </h1>
            </div>

            {/* Subheadline */}
            <p
              className={`
                max-w-lg text-lg leading-relaxed
                ${isDark ? "text-slate-400" : "text-slate-500"}
              `}
            >
              Real‑time USDC payment infrastructure for DAOs and ecosystem funds
              on Stellar. Stream capital continuously instead of lump‑sum
              grants.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#00b8d4] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-200/50 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0097a7] hover:shadow-cyan-300/50 active:translate-y-0"
                onClick={() => alert("Get started clicked")}
              >
                Get started
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <button
                className={`
                  flex cursor-pointer items-center gap-2 rounded-xl border px-6 py-3 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                  ${
                    isDark
                      ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-md"
                  }
                `}
                onClick={() => alert("Watch demo clicked")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Watch demo
              </button>
            </div>

            {/* Metrics Row */}
            <div className="flex flex-wrap gap-10 pt-2">
              {[
                { value: "$2.4M+", label: "Total streamed" },
                { value: "150+", label: "Active streams" },
                { value: "45+", label: "DAOs using" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span
                    className={`
                      text-3xl font-extrabold tracking-tight
                      ${isDark ? "text-white" : "text-slate-900"}
                    `}
                  >
                    {value}
                  </span>
                  <span
                    className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Active Stream Card ─── */}
          <div className="relative flex flex-1 justify-center lg:justify-end">
            {/* Main card */}
            <div
              className={`
                relative w-full max-w-[550px] min-h-[550px] rounded-2xl p-6 shadow-2xl
                ${
                  isDark
                    ? "border border-slate-700 bg-slate-800"
                    : "border border-slate-100 bg-white"
                }
              `}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon — exact replica from design */}
                  <div
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl"
                    style={{
                      background:
                        "#00B8D4",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Rounded square outline */}
                      <rect
                        x="4"
                        y="4"
                        width="20"
                        height="20"
                        rx="4"
                        stroke="white"
                        strokeWidth="2"
                        fill="none"
                      />
                      {/* X mark */}
                      <line
                        x1="9"
                        y1="9"
                        x2="19"
                        y2="19"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="19"
                        y1="9"
                        x2="9"
                        y2="19"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p
                      className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-800"}`}
                    >
                      Active Stream
                    </p>
                    <p
                      className={`text-sm ${isDark ? "text-slate-400" : "text-slate-400"}`}
                    >
                      Ecosystem Grant
                    </p>
                  </div>
                </div>
                {/* Streaming pill */}
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
                  Streaming
                </span>
              </div>

              {/* Current Balance */}
              <div className="mt-5 flex flex-col gap-4">
                <p
                  className={`mb-1 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}
                >
                  Current Balance
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    24,567
                  </span>
                  <span
                    className={`text-lg font-semibold ${isDark ? "text-slate-400" : "text-slate-400"}`}
                  >
                    USDC
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-emerald-500">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  <span className="text-sm font-semibold">+125 USDC/day</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Progress
                  </span>
                  <span
                    className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
                  >
                    67%
                  </span>
                </div>
                <div
                  className={`h-2.5 w-full overflow-hidden rounded-full ${isDark ? "bg-slate-700" : "bg-slate-100"}`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00b8d4] to-[#0097a7] transition-all duration-700"
                    style={{ width: "67%" }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between">
                  <span
                    className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    24,567 USDC
                  </span>
                  <span
                    className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    36,750 USDC
                  </span>
                </div>
              </div>

              {/* Recipients */}
              <div className="mt-5 flex items-center justify-between">
                <div
                  className={`flex items-center gap-2 text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Recipients
                </div>
                <div className="flex items-center">
                  {/* Avatars */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 ring-2 ring-white text-xs font-bold text-white">
                    A
                  </span>
                  <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 ring-2 ring-white text-xs font-bold text-white">
                    B
                  </span>
                  <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white text-xs font-bold text-white">
                    C
                  </span>
                  <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-white text-xs font-bold text-emerald-600">
                    +5
                  </span>
                </div>
              </div>

              {/* ── Sub-cards: anchored to bottom of main card ── */}
              <div className="absolute -bottom-[4.5rem] -left-5 -right-5 flex justify-between px-1">
                {/* Stream Rate */}
                <div
                  className={`
                    w-[35%] rounded-xl p-4 shadow-2xl
                    ${
                      isDark
                        ? "border border-slate-700 bg-slate-800"
                        : "border border-slate-100 bg-white"
                    }
                  `}
                >
                  <p
                    className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    Stream Rate
                  </p>
                  <p
                    className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    125 USDC
                  </p>
                  <p
                    className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    per day
                  </p>
                </div>

                {/* Time Remaining */}
                <div
                  className={`
                    w-[35%] rounded-xl p-4 shadow-2xl
                    ${
                      isDark
                        ? "border border-slate-700 bg-slate-800"
                        : "border border-slate-100 bg-white"
                    }
                  `}
                >
                  <p
                    className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    Time Remaining
                  </p>
                  <p
                    className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    98 days
                  </p>
                  <p
                    className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    until complete
                  </p>
                </div>
              </div>
              {/* ── end sub-cards ── */}
            </div>
            {/* ── end main card ── */}
          </div>
          {/* ── end right column ── */}
        </div>
      </div>
    </section>
  );
}

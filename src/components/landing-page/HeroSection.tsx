import { useState, useEffect } from "react";
import "../../design-tokens.css";

interface HeroSectionProps {
  theme?: "light" | "dark";
}

export default function HeroSection({ theme = "light" }: HeroSectionProps) {
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative min-h-[90vh] w-full overflow-hidden font-['Plus_Jakarta_Sans',system-ui,sans-serif] flex items-center"
      style={{
        background: isDark
          ? "radial-gradient(circle at 20% 30%, #152c3d 0%, #0a0e17 50%, #060910 100%)"
          : "radial-gradient(circle at 20% 30%, #e0f2fe 0%, #f8fafc 50%, #ffffff 100%)",
      }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px] opacity-20 ${isDark ? "bg-cyan-500" : "bg-cyan-300"}`}
          style={{ animation: "pulse 10s infinite alternate" }}
        />
        <div 
          className={`absolute top-1/2 -right-24 w-80 h-80 rounded-full blur-[100px] opacity-10 ${isDark ? "bg-emerald-500" : "bg-emerald-300"}`}
          style={{ animation: "pulse 8s infinite alternate-reverse" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ─── LEFT: Marketing Content ─── */}
          <div className={`flex flex-col gap-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            {/* Built on Stellar Tag */}
            <div className="flex items-center gap-2 self-start animate-fade-in">
              <div
                className={`
                  flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider
                  ${
                    isDark
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                      : "bg-cyan-50/80 text-cyan-700 border border-cyan-100 shadow-sm"
                  }
                `}
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </div>
                Built on Stellar
              </div>
            </div>

            {/* Headline Hierarchy */}
            <div className="flex flex-col gap-3">
              <h1
                id="landing-hero-title"
                className={`
                  text-5xl font-extrabold leading-[1.1] tracking-tight lg:text-7xl
                  ${isDark ? "text-white" : "text-slate-900"}
                `}
              >
                The future of <br/>
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Treasury Streaming
                </span>
              </h1>
              <p className={`text-heading-3 max-w-xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Real-time USDC infrastructure for DAOs, grants, and ecosystem funds. 
                Automate your payouts with second-by-second precision.
              </p>
            </div>

            {/* Subtext Detail (Accessibility & Trust) */}
            <p
              className={`
                text-body-lg max-w-lg opacity-80
                ${isDark ? "text-slate-500" : "text-slate-500"}
              `}
            >
              Move beyond manual monthly transfers. Fluxora provides high-integrity 
              streaming that builds trust through transparency and predictable liquidity.
            </p>

            {/* Primary CTA Flow */}
            <div className="flex flex-wrap items-center gap-5 mt-4">
              <button
                className="ui-primary-cta group relative overflow-hidden rounded-2xl px-8 py-4 text-lg font-bold shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-95"
                onClick={() => window.location.href = "/connect-wallet"}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Launch App
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              <button
                className="flex cursor-pointer items-center gap-3 rounded-2xl border px-8 py-4 text-lg font-bold transition-all duration-300 active:scale-95"
                style={{
                  borderColor: "var(--color-border-default)",
                  background: "var(--color-surface-default)",
                  color: "var(--color-text-secondary)",
                  boxShadow: "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-default)";
                }}
                onClick={() => alert("Watch demo clicked")}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                Watch Demo
              </button>
            </div>

            {/* Social Proof / Metrics */}
            <div className={`flex flex-wrap gap-12 mt-8 pt-8 border-t ${isDark ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
              {[
                { value: "$2.4M+", label: "Streamed" },
                { value: "150+", label: "Active Streams" },
                { value: "45+", label: "Verified DAOs" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-1 group">
                  <span
                    className={`
                      text-3xl font-extrabold tracking-tight transition-colors duration-300
                      ${isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"}
                    `}
                  >
                    {value}
                  </span>
                  <span className={`text-label-sm uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Glassmorphic Stream Card ─── */}
          <div className={`relative flex justify-center lg:justify-end transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {/* Animated Glow Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[120%] h-[120%] rounded-full opacity-[0.03] border border-cyan-500 animate-spin-slow" />
              <div className="w-[110%] h-[110%] rounded-full opacity-[0.02] border border-emerald-500 animate-reverse-spin-slow" />
            </div>

            {/* Main Interactive Card */}
            <div
              className={`
                relative w-full max-w-[500px] rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] 
                backdrop-blur-xl transition-all duration-500 hover:scale-[1.01] overflow-hidden
                ${
                  isDark
                    ? "bg-[#121a2a]/80 border border-white/10"
                    : "bg-white/80 border border-slate-200"
                }
              `}
              style={{ animation: "float 6s ease-in-out infinite" }}
            >
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -ml-16 -mb-16" />

              {/* Card Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/20 shrink-0">
                    <svg
                      aria-hidden="true"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <p className={`text-heading-4 leading-none mb-1.5 ${isDark ? "text-white" : "text-slate-800"}`}>
                      Stellar Growth Grant
                    </p>
                    <div className="flex items-center gap-2">
                       <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>from SCF Treasury</span>
                       <span className="h-1 w-1 rounded-full bg-slate-500" />
                       <span className="text-xs font-bold text-cyan-500 uppercase tracking-tighter">Verified</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                   </div>
                </div>
              </div>

              {/* Stream Visualizer */}
              <div className={`rounded-3xl p-6 mb-8 ${isDark ? "bg-black/20" : "bg-slate-50/50"}`}>
                <div className="flex flex-col gap-1 mb-6">
                  <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Streaming to you
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-black tabular-nums tracking-tighter ${isDark ? "text-white" : "text-slate-900"}`}>
                      24,812<span className="opacity-30">.42</span>
                    </span>
                    <span className={`text-xl font-bold uppercase ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      USDC
                    </span>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Progress to Milestone</span>
                    <span className={`text-xs font-black ${isDark ? "text-white" : "text-slate-900"}`}>67.4%</span>
                  </div>
                  <div className={`h-3 w-full rounded-full overflow-hidden p-1 ${isDark ? "bg-white/5" : "bg-slate-200/50"}`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 relative"
                      style={{ width: "67.4%" }}
                    >
                      <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={`text-[10px] font-bold ${isDark ? "text-slate-600" : "text-slate-400"}`}>EST. BALANCE</span>
                    <span className={`text-[10px] font-bold ${isDark ? "text-slate-600" : "text-slate-400"}`}>36,800.00 USDC</span>
                  </div>
                </div>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.02] ${isDark ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]" : "bg-white border-slate-100 hover:border-cyan-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rate</p>
                  <p className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>12.5 <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>USDC/hr</span></p>
                </div>
                <div className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.02] ${isDark ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]" : "bg-white border-slate-100 hover:border-emerald-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Ends In</p>
                  <p className={`text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>14 <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>days</span></p>
                </div>
              </div>

              {/* Withdraw Button Shortcut */}
              <button className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-cyan-500 font-black text-sm uppercase tracking-widest hover:from-cyan-500 hover:to-emerald-500 hover:text-white transition-all duration-300">
                Direct Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.2; }
          100% { transform: scale(1.2); opacity: 0.3; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-spin-slow {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-reverse-spin-slow { animation: reverse-spin-slow 25s linear infinite; }
      `}</style>
    </section>
  );
}

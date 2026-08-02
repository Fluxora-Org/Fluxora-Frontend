import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock, PauseCircle, Settings, Star } from "lucide-react";

export default function ValuePropositionSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    // Show immediately when reduced motion is preferred or when
    // IntersectionObserver is unavailable (older browsers, jsdom/SSR).
    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className='px-6 py-24 transition-colors duration-300'
    >
      <div className='max-w-6xl mx-auto text-center'>
        <h2 className='text-4xl font-semibold font-jakarta-sans text-slate-900 dark:text-white'>
          Treasury streaming infrastructure
        </h2>
        <p className='mt-4 text-lg text-slate-500 dark:text-slate-400'>
          Everything you need to manage continuous capital flow on Stellar
        </p>

        <div className='mt-16 grid grid-cols-1 md:grid-cols-2 gap-8'>
          <FeatureCard
            icon={Clock}
            title='Real-time USDC streaming'
            description='Funds accrue per second; recipients withdraw anytime. No batch delays, no waiting for payment cycles—continuous capital flow.'
            index={0}
            visible={visible}
          />
          <FeatureCard
            icon={Settings}
            title='Configurable rate & cliff'
            description='Set streaming rate, start/end timestamps, and optional cliff periods. Vesting schedules and grant programs in one primitive.'
            index={1}
            visible={visible}
          />
          <FeatureCard
            icon={PauseCircle}
            title='Pause and cancel controls'
            description='Treasury or admin can pause or cancel active streams. Unstreamed amounts return to sender automatically. Full control, always.'
            index={2}
            visible={visible}
          />
          <FeatureCard
            icon={Star}
            title='Built on Stellar & Soroban'
            description='Native Stellar infrastructure. Soroban smart contracts. Native USDC support. Built specifically for the Stellar ecosystem.'
            index={3}
            visible={visible}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  index,
  visible,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
  visible: boolean;
}) {
  const Icon = icon;

  return (
    <div
      className={`
        rounded-2xl border border-slate-200 bg-white p-8 text-left
        transition-all duration-500
        hover:shadow-lg
        dark:border-cyan-500/10 dark:bg-slate-900/60
        dark:hover:border-cyan-500/25 dark:hover:shadow-[0_8px_30px_rgba(8,145,178,0.12)]
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
      style={{
        transitionDelay: visible ? `${index * 80}ms` : "0ms",
      }}
    >
      <div className='mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500 dark:bg-cyan-500/15 dark:text-cyan-300'>
        <Icon className='h-6 w-6 stroke-2' />
      </div>
      <h3 className='text-lg font-semibold font-jakarta-sans text-slate-700 dark:text-slate-100'>
        {title}
      </h3>
      <p className='mt-3 text-sm leading-relaxed font-jakarta-sans text-slate-500 dark:text-slate-400'>
        {description}
      </p>
    </div>
  );
}
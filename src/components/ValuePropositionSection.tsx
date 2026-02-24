import type { LucideIcon } from "lucide-react";
import { Clock, PauseCircle, Settings, Star } from "lucide-react";

export default function ValuePropositionSection() {
	return (
		<section className='px-6 py-24 transition-colors duration-300'>
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
					/>
					<FeatureCard
						icon={Settings}
						title='Configurable rate & cliff'
						description='Set streaming rate, start/end timestamps, and optional cliff periods. Vesting schedules and grant programs in one primitive.'
					/>
					<FeatureCard
						icon={PauseCircle}
						title='Pause and cancel controls'
						description='Treasury or admin can pause or cancel active streams. Unstreamed amounts return to sender automatically. Full control, always.'
					/>
					<FeatureCard
						icon={Star}
						title='Built on Stellar & Soroban'
						description='Native Stellar infrastructure. Soroban smart contracts. Native USDC support. Built specifically for the Stellar ecosystem.'
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
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	const Icon = icon;

	return (
		<div className='rounded-2xl border border-slate-200 bg-white p-8 text-left transition-all duration-300 hover:shadow-lg dark:border-cyan-500/10 dark:bg-slate-900/60 dark:hover:border-cyan-500/25 dark:hover:shadow-[0_8px_30px_rgba(8,145,178,0.12)]'>
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

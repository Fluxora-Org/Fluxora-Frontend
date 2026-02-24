import { useEffect, useState } from "react";
import ValuePropositionSection from "@/components/ValuePropositionSection";

function LandingPage() {
	const [isDark, setIsDark] = useState(true);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	return (
		<div className='min-h-screen bg-slate-100 px-6 py-8 transition-colors duration-300 dark:bg-[#030a1c]'>
			<div className='mx-auto max-w-6xl'>
				<div className='mb-6 flex justify-end'>
					<button
						type='button'
						onClick={() => setIsDark((prev) => !prev)}
						className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20'>
						Switch to {isDark ? "Light" : "Dark"} Mode
					</button>
				</div>
			</div>
			<ValuePropositionSection />
		</div>
	);
}
export default LandingPage;

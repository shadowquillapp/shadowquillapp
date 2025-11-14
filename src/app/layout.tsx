import "@/styles/globals.css";
// Removed old theme overrides for fresh Material baseline
// Local Font Awesome CSS (installed via @fortawesome/fontawesome-free for offline use)
// Using tree-shaken SVG Font Awesome via react component; no global CSS import needed.

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import DatabaseSetupGate from "@/components/DatabaseSetupGate";
import { DialogProvider } from "@/components/DialogProvider";

export const metadata: Metadata = {
	title: "PromptCrafter",
	description: "PromptCrafter – AI assistant for building prompts",
	icons: [{ rel: "icon", url: "public/branding/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<head>{/* No external CDN links to allow full offline operation */}</head>
			<body className="overflow-hidden h-screen flex flex-col">
				<DialogProvider>
					<div className="flex-1 flex flex-col overflow-hidden">
						<DatabaseSetupGate>
							{children}
						</DatabaseSetupGate>
					</div>
				</DialogProvider>
			</body>
		</html>
	);
}

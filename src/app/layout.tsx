import "@/styles/globals.css";
// Removed old theme overrides for fresh Material baseline
// Local Font Awesome CSS (installed via @fortawesome/fontawesome-free for offline use)
// Using tree-shaken SVG Font Awesome via react component; no global CSS import needed.

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import DatabaseSetupGate from "@/components/DatabaseSetupGate";
import { DialogProvider } from "@/components/DialogProvider";
import OllamaConnectionMonitor from "@/components/OllamaConnectionMonitor";
import Titlebar from "@/components/Titlebar";

export const metadata: Metadata = {
	title: "ShadowQuill",
	description: "ShadowQuill – AI assistant for building prompts",
	icons: [{ rel: "icon", url: "public/branding/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<head>{/* No external CDN links to allow full offline operation */}</head>
			<body className="flex h-screen flex-col overflow-hidden">
				<DialogProvider>
					<Titlebar />
					<div className="flex flex-1 flex-col overflow-hidden">
						<DatabaseSetupGate>{children}</DatabaseSetupGate>
					</div>
					<OllamaConnectionMonitor />
				</DialogProvider>
			</body>
		</html>
	);
}

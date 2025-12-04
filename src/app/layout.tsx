import "@/styles/index.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { DialogProvider } from "@/components/DialogProvider";
import FindBar from "@/components/FindBar";
import OllamaConnectionMonitor from "@/components/OllamaConnectionMonitor";
import Titlebar from "@/components/Titlebar";

export const metadata: Metadata = {
	title: "ShadowQuill",
	description: "ShadowQuill | AI assistant for building prompts",
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
			<head>
				{/* No external CDN links to allow full offline operation */}
				<script src="/theme-init.js" />
			</head>
			<body className="flex h-screen flex-col overflow-hidden">
				<DialogProvider>
					<Titlebar />
					<div className="flex flex-1 flex-col overflow-hidden">{children}</div>
					<OllamaConnectionMonitor />
					<FindBar />
				</DialogProvider>
			</body>
		</html>
	);
}

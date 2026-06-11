import "@/styles/index.css";

import type { Metadata } from "next";

import { DialogProvider } from "@/components/DialogProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import FindBar from "@/components/FindBar";
import GlobalZoomControl from "@/components/GlobalZoomControl";
import OllamaConnectionMonitor from "@/components/OllamaConnectionMonitor";
import Titlebar from "@/components/Titlebar";

export const metadata: Metadata = {
	title: "ShadowQuill",
	description: "ShadowQuill | AI assistant for building prompts",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			{/* No external CDN links to allow full offline operation */}
			<body className="flex h-screen flex-col overflow-hidden">
				<DialogProvider>
					<Titlebar />
					<div className="flex flex-1 flex-col overflow-hidden">
						<ErrorBoundary>{children}</ErrorBoundary>
					</div>
					<OllamaConnectionMonitor />
					<FindBar />
					<GlobalZoomControl />
				</DialogProvider>
			</body>
		</html>
	);
}

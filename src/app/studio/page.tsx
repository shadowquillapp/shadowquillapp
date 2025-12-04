import type { Metadata } from "next";
import PresetStudioPage from "@/app/studio/PresetStudioPage";

export const metadata: Metadata = {
	title: "Preset Studio | ShadowQuill",
	description: "Create and manage your AI prompt presets",
};

export default function Page() {
	return <PresetStudioPage />;
}

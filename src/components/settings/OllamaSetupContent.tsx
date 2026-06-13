"use client";

import { useEffect } from "react";
import { OllamaSetupPanel } from "../OllamaSetupPanel";
import { useOllamaSetup } from "../useOllamaSetup";

export default function OllamaSetupContent() {
	const setup = useOllamaSetup();
	const { loadFromStorage } = setup;

	useEffect(() => {
		void loadFromStorage();
	}, [loadFromStorage]);

	return (
		<OllamaSetupPanel
			setup={setup}
			variant="settings"
			eyebrow="Local Inference"
			title="Secure Ollama Bridge"
			subtitle="Run ShadowQuill fully offline by pointing to your local Ollama instance."
			onSubmit={(e) => {
				e.preventDefault();
				void setup.saveConfiguration();
			}}
		/>
	);
}

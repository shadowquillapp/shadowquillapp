import {
	formatOllamaModelName,
	isSupportedOllamaModelName,
	SUPPORTED_OLLAMA_MODELS,
	writeLocalModelConfig as writeLocalModelConfigClient,
} from "@/lib/local-config";

interface ModelSelectorProps {
	availableModels: Array<{ name: string; size: number }>;
	currentModelId: string | null;
	setCurrentModelId: (id: string) => void;
	isGenerating: boolean;
}

/**
 * Vertical slider model selector component for choosing between installed Gemma models.
 */
export function ModelSelector({
	availableModels,
	currentModelId,
	setCurrentModelId,
	isGenerating,
}: ModelSelectorProps) {
	const modelIds = Array.from(
		new Set(
			(availableModels.length > 0
				? availableModels.map((model) => model.name)
				: SUPPORTED_OLLAMA_MODELS
			)
				.filter(isSupportedOllamaModelName)
				.map((id) => id.toLowerCase()),
		),
	);
	const models = modelIds.map((id) => {
		const tag = id.split(":")[1] || id;
		return {
			id,
			displayName: formatOllamaModelName(id),
			label:
				id.startsWith("gemma3:") && tag
					? `3 ${tag.toUpperCase()}`
					: tag === "latest"
						? "Latest"
						: tag.toUpperCase(),
		};
	});
	const selectorHeight = `min(${Math.max(80, models.length * 26 + 28)}px, 56vh)`;

	return (
		<div
			className="model-selector absolute z-10"
			style={{
				left: "var(--space-4)",
				bottom: "var(--space-4)",
				// Disable during generation - handled by parent CSS
				pointerEvents: isGenerating ? "none" : "auto",
				transition: "opacity 0.2s ease",
			}}
		>
			{/* Vertical Slider Model Selector */}
			<div
				className="relative"
				style={{
					width: "min(96px, 18vw)",
					height: selectorHeight,
					minWidth: "72px",
					minHeight: "80px",
				}}
			>
				{/* Slider container */}
				<div
					className="absolute inset-0 overflow-hidden rounded-[18px] border"
					style={{
						borderColor:
							"color-mix(in srgb, var(--color-outline), transparent 40%)",
						background:
							"color-mix(in srgb, var(--color-surface), transparent 70%)",
						backdropFilter: "blur(4px)",
						WebkitBackdropFilter: "blur(4px)",
						padding: "var(--space-2)",
					}}
				>
					{/* Header */}
					<div
						className="text-center font-bold text-[10px] uppercase tracking-wider"
						style={{
							color: "var(--color-on-surface)",
							opacity: 0.7,
							lineHeight: 1,
							marginBottom: "var(--space-1)",
						}}
					>
						GEMMA
					</div>
					{/* Stops */}
					<div
						className="relative z-[1] flex h-full flex-col items-stretch justify-between"
						style={{ height: "calc(100% - var(--space-4))" }}
					>
						{models.map((model) => {
							const isInstalled = availableModels.some(
								(m) => m.name.toLowerCase() === model.id,
							);
							const isActive = currentModelId?.toLowerCase() === model.id;
							return (
								<button
									key={model.id}
									type="button"
									disabled={!isInstalled}
									onClick={() => {
										if (!isInstalled) return;
										writeLocalModelConfigClient({
											provider: "ollama",
											baseUrl: "http://localhost:11434",
											model: model.id,
										});
										setCurrentModelId(model.id);
										try {
											window.dispatchEvent(
												new CustomEvent("sq-model-changed", {
													detail: { modelId: model.id },
												}),
											);
										} catch {}
									}}
									className={`flex h-[22px] w-full items-center justify-center rounded-[12px] font-bold text-[13px] transition-colors ${
										!isInstalled ? "cursor-not-allowed opacity-40" : ""
									}`}
									title={
										isInstalled
											? `Switch to ${model.displayName}`
											: `${model.displayName} is not installed`
									}
									aria-pressed={isActive}
									style={{
										lineHeight: 1,
										color: "var(--color-on-surface)",
										background: isActive
											? "color-mix(in srgb, var(--color-primary), var(--color-surface) 72%)"
											: "transparent",
										border: isActive
											? "1px solid color-mix(in srgb, var(--color-primary), var(--color-outline) 20%)"
											: "1px solid transparent",
									}}
								>
									{model.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

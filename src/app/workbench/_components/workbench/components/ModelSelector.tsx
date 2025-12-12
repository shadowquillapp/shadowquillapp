import { writeLocalModelConfig as writeLocalModelConfigClient } from "@/lib/local-config";

interface ModelSelectorProps {
	availableModels: Array<{ name: string; size: number }>;
	currentModelId: string | null;
	setCurrentModelId: (id: string) => void;
	isGenerating: boolean;
}

/**
 * Vertical slider model selector component for choosing between Gemma 3 model sizes.
 */
export function ModelSelector({
	availableModels,
	currentModelId,
	setCurrentModelId,
	isGenerating,
}: ModelSelectorProps) {
	const models = [
		{ label: "4B", id: "gemma3:4b" },
		{ label: "12B", id: "gemma3:12b" },
		{ label: "27B", id: "gemma3:27b" },
	];

	return (
		<div
			className="absolute z-10"
			style={{
				left: "var(--space-4)",
				bottom: "var(--space-4)",
				// Disable during generation
				pointerEvents: isGenerating ? "none" : "auto",
				opacity: isGenerating ? 0.5 : 1,
			}}
		>
			{/* Vertical Slider Model Selector */}
			<div
				className="relative"
				style={{
					width: "min(80px, 16vw)",
					height: "min(80px, 16vw)",
					minWidth: "54px",
					minHeight: "54px",
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
						GEMMA 3
					</div>
					{/* Stops */}
					<div
						className="relative z-[1] flex h-full flex-col items-stretch justify-between"
						style={{ height: "calc(100% - var(--space-4))" }}
					>
						{models.map((model) => {
							const isInstalled = availableModels.some(
								(m) => m.name === model.id,
							);
							const isActive = currentModelId === model.id;
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
											? `Switch to Gemma 3 ${model.label}`
											: `Gemma 3 ${model.label} is not installed`
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

import { resolveOllamaBaseUrl } from "@/lib/domain/model-config";
import {
	formatOllamaModelName,
	isSupportedOllamaModelName,
	readLocalModelConfig as readLocalModelConfigClient,
	writeLocalModelConfig as writeLocalModelConfigClient,
} from "@/lib/local-config";

interface ModelSelectorProps {
	availableModels: Array<{ name: string; size: number }>;
	modelLoadError: string | null;
	refreshModels: () => Promise<void>;
	currentModelId: string | null;
	setCurrentModelId: (id: string) => void;
	isGenerating: boolean;
}

const COMPACT_BTN_STYLE = {
	height: 22,
	padding: "0 var(--space-2)",
	fontSize: "var(--text-2xs)",
} as const;

function formatModelLabel(id: string, tag: string): string {
	for (const gen of ["3", "4"] as const) {
		if (id.startsWith(`gemma${gen}:`) && tag) {
			return tag === "latest" ? `${gen} Latest` : `${gen} ${tag.toUpperCase()}`;
		}
	}
	return tag.toUpperCase();
}

export function ModelSelector({
	availableModels,
	modelLoadError,
	refreshModels,
	currentModelId,
	setCurrentModelId,
	isGenerating,
}: ModelSelectorProps) {
	const modelIds = Array.from(
		new Set(
			availableModels
				.map((model) => model.name)
				.filter(isSupportedOllamaModelName)
				.map((id) => id.toLowerCase()),
		),
	);
	const installedIds = new Set(
		availableModels.map((m) => m.name.toLowerCase()),
	);
	const models = modelIds.map((id) => {
		const tag = id.split(":")[1] || id;
		return {
			id,
			displayName: formatOllamaModelName(id),
			label: formatModelLabel(id, tag),
		};
	});
	return (
		<div
			className="model-selector flex min-w-0 items-center"
			style={{
				gap: "var(--space-1)",
				pointerEvents: isGenerating ? "none" : "auto",
				opacity: isGenerating ? 0.5 : 1,
			}}
		>
			<span
				className="font-semibold text-[length:var(--text-2xs)] uppercase"
				style={{
					color: "var(--color-on-surface-variant)",
					letterSpacing: "var(--label-tracking)",
					marginRight: "var(--space-1)",
					whiteSpace: "nowrap",
				}}
			>
				Model
			</span>
			{modelLoadError && (
				<button
					type="button"
					className="md-btn"
					onClick={() => void refreshModels()}
					title={modelLoadError}
					aria-label={`Retry loading models: ${modelLoadError}`}
					style={COMPACT_BTN_STYLE}
				>
					Retry
				</button>
			)}
			<div
				className="flex min-w-0 items-center overflow-x-auto"
				style={{ gap: "var(--space-1)" }}
			>
				{modelLoadError ? (
					<>
						<span
							className="font-sans text-[length:var(--text-2xs)]"
							style={{
								color: "var(--color-error)",
								whiteSpace: "nowrap",
							}}
						>
							No Ollama connection found
						</span>
						<button
							type="button"
							className="md-btn"
							onClick={() => {
								window.dispatchEvent(
									new CustomEvent("open-app-settings", {
										detail: { tab: "ollama" },
									}),
								);
							}}
							style={COMPACT_BTN_STYLE}
						>
							Set up
						</button>
					</>
				) : (
					models.map((model) => {
						const isInstalled = installedIds.has(model.id);
						const isActive = currentModelId?.toLowerCase() === model.id;
						return (
							<button
								key={model.id}
								type="button"
								disabled={!isInstalled}
								onClick={() => {
									if (!isInstalled) return;
									const cfg = readLocalModelConfigClient();
									writeLocalModelConfigClient({
										provider: "ollama",
										baseUrl: resolveOllamaBaseUrl(cfg),
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
								className={`model-selector__pill flex h-[22px] items-center justify-center px-2 font-mono font-semibold text-[length:var(--text-xs)] ${
									!isInstalled ? "cursor-not-allowed opacity-40" : ""
								}`}
								title={
									isInstalled
										? `Switch to ${model.displayName}`
										: `${model.displayName} is not installed - run: ollama pull ${model.id}`
								}
								aria-pressed={isActive}
								style={{
									lineHeight: 1,
									whiteSpace: "nowrap",
									borderRadius: "var(--radius-sm)",
									color: isActive
										? "var(--color-on-surface)"
										: "var(--color-on-surface-variant)",
									background: isActive
										? "color-mix(in srgb, var(--color-accent) 16%, transparent)"
										: "transparent",
									border: isActive
										? "1px solid var(--color-accent)"
										: "1px solid var(--color-outline)",
								}}
							>
								{model.label}
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}

import { Icon } from "@/components/Icon";

interface TextStatsProps {
	wordCount: number;
	charCount: number;
}

export function TextStats({ wordCount, charCount }: TextStatsProps) {
	return (
		<div
			className="hidden items-center text-on-surface-variant/70 sm:flex"
			style={{ gap: "var(--space-1)" }}
		>
			<div
				className="flex items-center"
				style={{ fontSize: "var(--text-2xs)", gap: "var(--space-1)" }}
			>
				<Icon
					name="file-text"
					style={{ width: 10, height: 10, opacity: 0.6 }}
				/>
				<span style={{ fontVariantNumeric: "tabular-nums" }}>
					{wordCount.toLocaleString()}
				</span>
				<span style={{ opacity: 0.5 }}>words</span>
			</div>
			<span
				style={{
					opacity: 0.3,
					marginLeft: "var(--space-1)",
					marginRight: "var(--space-1)",
				}}
			>
				•
			</span>
			<div
				className="flex items-center"
				style={{ fontSize: "var(--text-2xs)", gap: "var(--space-1)" }}
			>
				<span style={{ fontVariantNumeric: "tabular-nums" }}>
					{charCount.toLocaleString()}
				</span>
				<span style={{ opacity: 0.5 }}>chars</span>
			</div>
		</div>
	);
}

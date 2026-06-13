import type { ReactNode } from "react";

interface SettingRowProps {
	label: string;
	description?: string;
	htmlFor?: string;
	stacked?: boolean;
	children: ReactNode;
}

export default function SettingRow({
	label,
	description,
	htmlFor,
	stacked = false,
	children,
}: SettingRowProps) {
	return (
		<div className={`settings-row ${stacked ? "settings-row--stacked" : ""}`}>
			<div className="settings-row__label">
				{htmlFor ? (
					<label htmlFor={htmlFor}>{label}</label>
				) : (
					<div>{label}</div>
				)}
				{description && <span>{description}</span>}
			</div>
			<div className="settings-row__control">{children}</div>
		</div>
	);
}

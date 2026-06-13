"use client";

import { Icon } from "@/components/Icon";

interface StudioHeaderProps {
	isSmallScreen?: boolean;
	sidebarOpen?: boolean;
	onToggleSidebar?: () => void;
}

export default function StudioHeader({
	isSmallScreen,
	sidebarOpen,
	onToggleSidebar,
}: StudioHeaderProps) {
	return (
		<header
			className="simple-workbench__header"
			style={{
				flexWrap: "nowrap",
				gap: "8px",
				padding: "10px 12px",
				alignItems: "center",
			}}
		>
			<div
				className="simple-workbench__header-left"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "10px",
					flexWrap: "nowrap",
					flex: "1 1 auto",
					minWidth: 0,
					overflow: "hidden",
				}}
			>
				{isSmallScreen && (
					<button
						type="button"
						className="md-icon-btn"
						style={{ flexShrink: 0 }}
						onClick={onToggleSidebar}
						title="Toggle sidebar"
						aria-label="Toggle preset library sidebar"
						aria-expanded={sidebarOpen}
					>
						<Icon name="bars" className="h-4 w-4" />
					</button>
				)}

				<span
					style={{
						fontSize: "var(--text-base)",
						fontWeight: 600,
						color: "var(--color-on-surface)",
						whiteSpace: "nowrap",
					}}
				>
					Preset Studio
				</span>
			</div>
		</header>
	);
}

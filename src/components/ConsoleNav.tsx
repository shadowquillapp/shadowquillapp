"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDialog } from "./DialogProvider";
import { Icon, type IconName } from "./Icon";

const NAV_ITEMS: { label: string; icon: IconName; path: string }[] = [
	{ label: "Workbench", icon: "terminal", path: "/workbench" },
	{ label: "Studio", icon: "brush", path: "/studio" },
];

export default function ConsoleNav() {
	const router = useRouter();
	const pathname = usePathname();
	const { confirm } = useDialog();

	const navigate = async (path: string) => {
		if (pathname?.startsWith(path)) return;
		if (pathname?.startsWith("/studio") && document.body.dataset.studioDirty) {
			const confirmed = await confirm({
				title: "Leave Studio?",
				message:
					"You have unsaved preset changes. Leave Studio and discard them?",
				confirmText: "Leave",
				cancelText: "Stay",
				tone: "destructive",
			});
			if (!confirmed) return;
		}
		router.push(path);
	};

	return (
		<nav className="console-nav" aria-label="Primary">
			<div className="console-nav__items">
				{NAV_ITEMS.map((item) => {
					const isActive = pathname?.startsWith(item.path) ?? false;
					return (
						<button
							key={item.path}
							type="button"
							className={`console-nav__item ${isActive ? "console-nav__item--active" : ""}`}
							aria-current={isActive ? "page" : undefined}
							aria-label={item.label}
							title={item.label}
							onClick={() => {
								void navigate(item.path);
							}}
						>
							<Icon name={item.icon} />
						</button>
					);
				})}
			</div>
			<div className="console-nav__bottom">
				<button
					type="button"
					className="console-nav__settings-btn"
					title="Settings"
					aria-label="Settings"
					onClick={() => {
						window.dispatchEvent(new CustomEvent("open-app-settings"));
					}}
				>
					<Icon name="gear" />
				</button>
			</div>
		</nav>
	);
}

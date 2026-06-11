export type StorageScope = "local" | "session";

export const STORAGE_KEYS = {
	WORKBENCH_TABS: { key: "workbench-tabs-v1", scope: "local" },
	PRESETS: { key: "PC_PRESETS", scope: "local" },
	PROJECTS: { key: "PC_PROJECTS", scope: "local" },
	TEST_MESSAGES: { key: "PC_TEST_MESSAGES", scope: "local" },
	MODEL_PROVIDER: { key: "MODEL_PROVIDER", scope: "local" },
	MODEL_BASE_URL: { key: "MODEL_BASE_URL", scope: "local" },
	MODEL_NAME: { key: "MODEL_NAME", scope: "local" },
	SYSTEM_PROMPT_BUILD: { key: "SYSTEM_PROMPT_BUILD", scope: "local" },
	RECENT_PRESETS: { key: "recent-presets", scope: "local" },
	LAST_SELECTED_PRESET: { key: "last-selected-preset", scope: "local" },
	PANEL_WIDTH: { key: "shadowquill:panelWidth", scope: "local" },
	APPLY_PRESET: { key: "PC_APPLY_PRESET", scope: "session" },
	PROMPT_CACHE: { key: "SQ_PROMPT_CACHE", scope: "session" },
} as const satisfies Record<
	string,
	{ readonly key: string; readonly scope: StorageScope }
>;

export const ALL_LOCAL_KEYS: readonly string[] = Object.values(STORAGE_KEYS)
	.filter((s) => s.scope === "local")
	.map((s) => s.key);

export const ALL_SESSION_KEYS: readonly string[] = Object.values(STORAGE_KEYS)
	.filter((s) => s.scope === "session")
	.map((s) => s.key);

import type { IconName } from "@/components/Icon";

export function getTaskTypeIcon(taskType: string): IconName {
	switch (taskType) {
		case "engineering":
			return "git-compare";
		case "visual":
			return "palette";
		case "motion":
			return "eye";
		case "analysis":
			return "search";
		case "narrative":
			return "edit";
		case "persuasion":
			return "thumbsUp";
		default:
			return "folder-open";
	}
}

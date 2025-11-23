export interface AppSetting {
	id: string;
	key: string;
	value: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PromptPreset {
	id: string;
	userId: string;
	name: string;
	taskType: string;
	options: any;
	createdAt: Date;
	updatedAt: Date;
}

export interface Chat {
	id: string;
	userId: string;
	title: string | null;
	createdAt: Date;
	updatedAt: Date;
	versionGraph?: any;
}

export interface ChatMessage {
	id: string;
	chatId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: Date;
}

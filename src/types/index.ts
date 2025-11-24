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

export interface PromptProject {
	id: string;
	userId: string;
	title: string | null;
	createdAt: Date;
	updatedAt: Date;
	versionGraph?: any;
}

export interface TestMessage {
	id: string;
	projectId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: Date;
}

export interface SystemSpecs {
	cpu: string;
	ram: number;
	gpu: string;
}

declare global {
	interface Window {
		shadowquill?: {
			getPlatform?: () => Promise<string>;
			getSystemSpecs?: () => Promise<SystemSpecs>;
			window?: {
				minimize?: () => Promise<void>;
				maximizeToggle?: () => Promise<void>;
				close?: () => Promise<void>;
			};
			checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
			openOllama?: () => Promise<{ ok: boolean; error?: string }>;
			getDataPaths?: () => Promise<any>;
			factoryReset?: () => Promise<any>;
			restartApp?: () => Promise<any>;
		};
	}
}

export type PromptErrorCode =
	| "VALIDATION_ERROR"
	| "GENERATION_ERROR"
	| "STORAGE_ERROR"
	| "MODEL_ERROR"
	| "CACHE_ERROR"
	| "NETWORK_ERROR"
	| "PRESET_ERROR";

interface BaseErrorOptions {
	details?: Record<string, unknown>;
	cause?: Error;
}

function baseOptions(options?: BaseErrorOptions): BaseErrorOptions {
	return {
		...(options?.details && { details: options.details }),
		...(options?.cause && { cause: options.cause }),
	};
}

export class ShadowQuillError extends Error {
	readonly code: PromptErrorCode;
	readonly timestamp: Date;
	readonly details: Record<string, unknown> | undefined;
	override readonly cause: Error | undefined;

	constructor(
		code: PromptErrorCode,
		message: string,
		options?: {
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super(message);
		this.name = "ShadowQuillError";
		this.code = code;
		this.timestamp = new Date();
		this.details = options?.details;
		this.cause = options?.cause;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	get userMessage(): string {
		const messages: Record<PromptErrorCode, string> = {
			VALIDATION_ERROR: "The input provided is invalid.",
			GENERATION_ERROR: "Failed to generate the prompt.",
			STORAGE_ERROR: "Failed to save or load data.",
			MODEL_ERROR: "The AI model encountered an error.",
			CACHE_ERROR: "Cache operation failed.",
			NETWORK_ERROR: "Network connection failed.",
			PRESET_ERROR: "Preset operation failed.",
		};
		return messages[this.code];
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			timestamp: this.timestamp.toISOString(),
			details: this.details,
			stack: this.stack,
		};
	}
}

export class ValidationError extends ShadowQuillError {
	readonly field: string | undefined;
	readonly value: unknown | undefined;

	constructor(
		message: string,
		options?: {
			field?: string;
			value?: unknown;
			details?: Record<string, unknown>;
		},
	) {
		super("VALIDATION_ERROR", message, baseOptions(options));
		this.name = "ValidationError";
		this.field = options?.field;
		this.value = options?.value;
	}
}

export class GenerationError extends ShadowQuillError {
	readonly taskType: string | undefined;
	readonly inputLength: number | undefined;

	constructor(
		message: string,
		options?: {
			taskType?: string;
			inputLength?: number;
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super("GENERATION_ERROR", message, baseOptions(options));
		this.name = "GenerationError";
		this.taskType = options?.taskType;
		this.inputLength = options?.inputLength;
	}
}

export class StorageError extends ShadowQuillError {
	readonly operation: "read" | "write" | "delete" | undefined;
	readonly key: string | undefined;

	constructor(
		message: string,
		options?: {
			operation?: "read" | "write" | "delete";
			key?: string;
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super("STORAGE_ERROR", message, baseOptions(options));
		this.name = "StorageError";
		this.operation = options?.operation;
		this.key = options?.key;
	}
}

export class ModelError extends ShadowQuillError {
	readonly modelId: string | undefined;
	readonly statusCode: number | undefined;
	readonly isTimeout: boolean | undefined;

	constructor(
		message: string,
		options?: {
			modelId?: string;
			statusCode?: number;
			isTimeout?: boolean;
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super("MODEL_ERROR", message, baseOptions(options));
		this.name = "ModelError";
		this.modelId = options?.modelId;
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
	}
}

export class CacheError extends ShadowQuillError {
	readonly cacheType: "memory" | "session" | "local" | undefined;

	constructor(
		message: string,
		options?: {
			cacheType?: "memory" | "session" | "local";
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super("CACHE_ERROR", message, baseOptions(options));
		this.name = "CacheError";
		this.cacheType = options?.cacheType;
	}
}

export class NetworkError extends ShadowQuillError {
	readonly endpoint: string | undefined;
	readonly statusCode: number | undefined;
	readonly isTimeout: boolean | undefined;

	constructor(
		message: string,
		options?: {
			endpoint?: string;
			statusCode?: number;
			isTimeout?: boolean;
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super("NETWORK_ERROR", message, baseOptions(options));
		this.name = "NetworkError";
		this.endpoint = options?.endpoint;
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
	}
}

export class PresetError extends ShadowQuillError {
	readonly presetId: string | undefined;
	readonly presetName: string | undefined;
	readonly operation: "create" | "update" | "delete" | "load" | undefined;

	constructor(
		message: string,
		options?: {
			presetId?: string;
			presetName?: string;
			operation?: "create" | "update" | "delete" | "load";
			details?: Record<string, unknown>;
			cause?: Error;
		},
	) {
		super("PRESET_ERROR", message, baseOptions(options));
		this.name = "PresetError";
		this.presetId = options?.presetId;
		this.presetName = options?.presetName;
		this.operation = options?.operation;
	}
}

export function isShadowQuillError(error: unknown): error is ShadowQuillError {
	return error instanceof ShadowQuillError;
}

export function wrapError(
	error: unknown,
	code: PromptErrorCode = "GENERATION_ERROR",
	message?: string,
): ShadowQuillError {
	if (error instanceof ShadowQuillError) {
		return error;
	}

	const originalError = error instanceof Error ? error : undefined;
	const errorMessage =
		message || (originalError?.message ?? "An unexpected error occurred");

	return new ShadowQuillError(code, errorMessage, {
		...(originalError && { cause: originalError }),
		details: {
			originalType: originalError?.name ?? typeof error,
		},
	});
}

export function getUserMessage(error: unknown): string {
	if (isShadowQuillError(error)) {
		return error.userMessage;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "An unexpected error occurred";
}

export function formatErrorLog(error: unknown): string {
	if (isShadowQuillError(error)) {
		return JSON.stringify(error.toJSON(), null, 2);
	}
	if (error instanceof Error) {
		return JSON.stringify(
			{
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			null,
			2,
		);
	}
	return String(error);
}

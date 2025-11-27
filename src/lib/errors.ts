/**
 * Structured error handling system for ShadowQuill
 * Provides typed error classes with detailed context
 */

// ============================================
// Error Codes
// ============================================

export type PromptErrorCode =
	| "VALIDATION_ERROR"
	| "GENERATION_ERROR"
	| "STORAGE_ERROR"
	| "MODEL_ERROR"
	| "CACHE_ERROR"
	| "NETWORK_ERROR"
	| "PRESET_ERROR";

// ============================================
// Base Error Class
// ============================================

/**
 * Base error class for ShadowQuill errors
 * Extends Error with structured metadata
 */
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

		// Maintain proper stack trace in V8 environments
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Get a user-friendly error message
	 */
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

	/**
	 * Convert to JSON for logging/serialization
	 */
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

// ============================================
// Specific Error Classes
// ============================================

/**
 * Error for input validation failures
 */
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
		super("VALIDATION_ERROR", message, {
			...(options?.details && { details: options.details }),
		});
		this.name = "ValidationError";
		this.field = options?.field;
		this.value = options?.value;
	}
}

/**
 * Error for prompt generation failures
 */
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
		super("GENERATION_ERROR", message, {
			...(options?.details && { details: options.details }),
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "GenerationError";
		this.taskType = options?.taskType;
		this.inputLength = options?.inputLength;
	}
}

/**
 * Error for storage/persistence failures
 */
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
		super("STORAGE_ERROR", message, {
			...(options?.details && { details: options.details }),
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "StorageError";
		this.operation = options?.operation;
		this.key = options?.key;
	}
}

/**
 * Error for AI model communication failures
 */
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
		super("MODEL_ERROR", message, {
			...(options?.details && { details: options.details }),
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "ModelError";
		this.modelId = options?.modelId;
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
	}
}

/**
 * Error for cache-related failures
 */
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
		super("CACHE_ERROR", message, {
			...(options?.details && { details: options.details }),
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "CacheError";
		this.cacheType = options?.cacheType;
	}
}

/**
 * Error for network/connectivity failures
 */
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
		super("NETWORK_ERROR", message, {
			...(options?.details && { details: options.details }),
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "NetworkError";
		this.endpoint = options?.endpoint;
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
	}
}

/**
 * Error for preset-related failures
 */
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
		super("PRESET_ERROR", message, {
			...(options?.details && { details: options.details }),
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "PresetError";
		this.presetId = options?.presetId;
		this.presetName = options?.presetName;
		this.operation = options?.operation;
	}
}

// ============================================
// Error Utilities
// ============================================

/**
 * Type guard to check if an error is a ShadowQuillError
 */
export function isShadowQuillError(error: unknown): error is ShadowQuillError {
	return error instanceof ShadowQuillError;
}

/**
 * Wrap an unknown error in a ShadowQuillError
 */
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
		message ||
		(originalError?.message ?? "An unexpected error occurred");

	return new ShadowQuillError(code, errorMessage, {
		...(originalError && { cause: originalError }),
		details: {
			originalType: originalError?.name ?? typeof error,
		},
	});
}

/**
 * Extract a user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
	if (isShadowQuillError(error)) {
		return error.userMessage;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "An unexpected error occurred";
}

/**
 * Create a formatted error log entry
 */
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

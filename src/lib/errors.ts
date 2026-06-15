export type PromptErrorCode =
	| "VALIDATION_ERROR"
	| "MODEL_ERROR"
	| "NETWORK_ERROR";

export class ShadowQuillError extends Error {
	readonly code: PromptErrorCode;
	override readonly cause: Error | undefined;

	constructor(
		code: PromptErrorCode,
		message: string,
		options?: { cause?: Error },
	) {
		super(message);
		this.name = "ShadowQuillError";
		this.code = code;
		this.cause = options?.cause;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export class ValidationError extends ShadowQuillError {
	constructor(message: string) {
		super("VALIDATION_ERROR", message);
		this.name = "ValidationError";
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
			cause?: Error;
		},
	) {
		super("MODEL_ERROR", message, {
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "ModelError";
		this.modelId = options?.modelId;
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
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
			cause?: Error;
		},
	) {
		super("NETWORK_ERROR", message, {
			...(options?.cause && { cause: options.cause }),
		});
		this.name = "NetworkError";
		this.endpoint = options?.endpoint;
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
	}
}

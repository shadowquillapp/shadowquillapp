import { describe, expect, it } from "vitest";
import {
	ModelError,
	NetworkError,
	ShadowQuillError,
	ValidationError,
} from "@/lib/errors";

describe("errors", () => {
	it("carries code, name, and optional cause", () => {
		const cause = new Error("root");
		const base = new ShadowQuillError("MODEL_ERROR", "failed", { cause });
		expect(base.code).toBe("MODEL_ERROR");
		expect(base.name).toBe("ShadowQuillError");
		expect(base.cause).toBe(cause);
	});

	it("types validation, model, and network errors", () => {
		const validation = new ValidationError("bad input");
		expect(validation.code).toBe("VALIDATION_ERROR");
		expect(validation.name).toBe("ValidationError");

		const model = new ModelError("model down", {
			modelId: "gemma3:4b",
			statusCode: 500,
			isTimeout: true,
		});
		expect(model.modelId).toBe("gemma3:4b");
		expect(model.isTimeout).toBe(true);

		const network = new NetworkError("offline", {
			endpoint: "http://localhost:11434/api/generate",
			isTimeout: true,
		});
		expect(network.endpoint).toContain("/api/generate");
		expect(network.isTimeout).toBe(true);
	});
});

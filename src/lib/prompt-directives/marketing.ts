import type { GenerationOptions } from "@/types";

/**
 * Build marketing-specific directives
 */
export function buildMarketingDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	if (options.marketingChannel) {
		const channelGuidance: Record<string, string> = {
			email:
				"Channel: Email - strong subject, compelling preview, skimmable body.",
			landing_page:
				"Channel: Landing page - benefit-led headline, proof points, prominent CTA.",
			social: "Channel: Social media - short hooks, scannable, platform-friendly.",
			ad: "Channel: Ad - concise headline and body within character limits.",
		};
		directives.push(
			channelGuidance[options.marketingChannel] ??
				`Channel: ${options.marketingChannel}.`,
		);
	}

	if (options.ctaStyle) {
		const ctaGuidance: Record<string, string> = {
			soft: "CTA: Soft - low-friction engagement.",
			standard: "CTA: Standard - clear with balanced urgency.",
			strong: "CTA: Strong - urgent and prominent.",
		};
		directives.push(ctaGuidance[options.ctaStyle] ?? "");
	}

	if (options.valueProps?.trim()) {
		directives.push(`Value propositions: ${options.valueProps}`);
	}

	if (options.complianceNotes?.trim()) {
		directives.push(`Compliance requirements: ${options.complianceNotes}`);
	}

	return directives;
}


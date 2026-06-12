"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface FeatherLoaderProps {
	className?: string;
	text?: string;
}

export default function FeatherLoader({
	className = "",
	text = "Generating",
}: FeatherLoaderProps) {
	const [dotCount, setDotCount] = useState(1);
	const dots = ".".repeat(dotCount);

	useEffect(() => {
		const timer = setInterval(() => {
			setDotCount((c) => (c % 3) + 1);
		}, 400);
		return () => clearInterval(timer);
	}, []);

	return (
		<div
			role="status"
			className={`luxury-loader ${className}`}
			aria-busy="true"
		>
			<div className="luxury-loader__icon" aria-hidden="true">
				<Icon name="brush" />
			</div>
			<span className="luxury-loader__text" aria-hidden="true">
				{text}
				<span
					style={{
						display: "inline-block",
						width: "3ch",
						textAlign: "left",
					}}
				>
					{dots}
				</span>
			</span>
			<span className="sr-only">{text}</span>
		</div>
	);
}

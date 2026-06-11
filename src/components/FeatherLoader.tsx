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

	useEffect(() => {
		const timer = setInterval(() => {
			setDotCount((c) => (c % 3) + 1);
		}, 400);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className={`luxury-loader ${className}`}>
			<div className="luxury-loader__icon">
				<Icon name="brush" title="Loading" />
			</div>
			<span className="luxury-loader__text">
				{text}
				<span
					aria-hidden="true"
					style={{
						display: "inline-block",
						width: "3ch",
						textAlign: "left",
					}}
				>
					{".".repeat(dotCount)}
				</span>
			</span>
		</div>
	);
}

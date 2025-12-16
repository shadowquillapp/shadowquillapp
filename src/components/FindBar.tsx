"use client";

import {
	ChevronDownIcon,
	ChevronUpIcon,
	XMarkIcon,
} from "@heroicons/react/24/solid";
import { useCallback, useEffect, useRef, useState } from "react";

const HIGHLIGHT_CLASS = "find-highlight";
const ACTIVE_CLASS = "find-highlight--active";
const PULSE_CLASS = "find-highlight--pulse";

export default function FindBar() {
	const [isVisible, setIsVisible] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [matchCount, setMatchCount] = useState(0);
	const [currentMatch, setCurrentMatch] = useState(0);
	const [hasSearched, setHasSearched] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const highlightsRef = useRef<HTMLElement[]>([]);

	// Clear all highlights from the DOM
	const clearHighlights = useCallback(() => {
		for (const mark of highlightsRef.current) {
			const parent = mark.parentNode;
			if (parent) {
				// Replace the mark with its text content
				const text = document.createTextNode(mark.textContent || "");
				parent.replaceChild(text, mark);
				// Normalize to merge adjacent text nodes
				parent.normalize();
			}
		}
		highlightsRef.current = [];
		setMatchCount(0);
		setCurrentMatch(0);
	}, []);

	// Activate a specific match (make it the "current" one)
	const activateMatch = useCallback((marks: HTMLElement[], index: number) => {
		// Remove active class from all
		for (const m of marks) {
			m.classList.remove(ACTIVE_CLASS);
			m.classList.remove(PULSE_CLASS);
		}

		// Add active class to current
		const activeMatch = marks[index];
		if (activeMatch) {
			activeMatch.classList.add(ACTIVE_CLASS);
			activeMatch.classList.add(PULSE_CLASS);

			// Scroll into view
			activeMatch.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "nearest",
			});

			// Remove pulse class after animation
			setTimeout(() => {
				activeMatch.classList.remove(PULSE_CLASS);
			}, 400);
		}
	}, []);

	// Perform search and highlight matches
	const performSearch = useCallback(
		(text: string) => {
			// First clear existing highlights
			clearHighlights();

			if (!text.trim()) return;

			const searchTerm = text.toLowerCase();
			const marks: HTMLElement[] = [];

			// Walk the DOM and find text nodes
			const walker = document.createTreeWalker(
				document.body,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode: (node) => {
						// Skip script, style, and our own find bar
						const parent = node.parentElement;
						if (!parent) return NodeFilter.FILTER_REJECT;

						const tagName = parent.tagName.toLowerCase();
						if (
							tagName === "script" ||
							tagName === "style" ||
							tagName === "noscript"
						) {
							return NodeFilter.FILTER_REJECT;
						}

						// Skip the find bar itself
						if (parent.closest("[data-find-bar]")) {
							return NodeFilter.FILTER_REJECT;
						}

						// Skip already highlighted nodes
						if (parent.classList.contains(HIGHLIGHT_CLASS)) {
							return NodeFilter.FILTER_REJECT;
						}

						// Check if text contains search term
						const nodeText = node.textContent?.toLowerCase() || "";
						if (nodeText.includes(searchTerm)) {
							return NodeFilter.FILTER_ACCEPT;
						}

						return NodeFilter.FILTER_REJECT;
					},
				},
			);

			const nodesToProcess: Text[] = [];
			let currentNode = walker.nextNode();
			while (currentNode) {
				nodesToProcess.push(currentNode as Text);
				currentNode = walker.nextNode();
			}

			// Process each text node
			for (const textNode of nodesToProcess) {
				const nodeText = textNode.textContent || "";
				const lowerText = nodeText.toLowerCase();
				let lastIndex = 0;
				let index = lowerText.indexOf(searchTerm);

				if (index === -1) continue;

				const fragment = document.createDocumentFragment();

				while (index !== -1) {
					// Add text before match
					if (index > lastIndex) {
						fragment.appendChild(
							document.createTextNode(nodeText.slice(lastIndex, index)),
						);
					}

					// Create highlight mark
					const mark = document.createElement("mark");
					mark.className = HIGHLIGHT_CLASS;
					mark.textContent = nodeText.slice(index, index + searchTerm.length);
					fragment.appendChild(mark);
					marks.push(mark);

					lastIndex = index + searchTerm.length;
					index = lowerText.indexOf(searchTerm, lastIndex);
				}

				// Add remaining text
				if (lastIndex < nodeText.length) {
					fragment.appendChild(
						document.createTextNode(nodeText.slice(lastIndex)),
					);
				}

				// Replace text node with fragment
				textNode.parentNode?.replaceChild(fragment, textNode);
			}

			highlightsRef.current = marks;
			setMatchCount(marks.length);
			setHasSearched(true);

			// Activate first match if any
			if (marks.length > 0) {
				setCurrentMatch(1);
				activateMatch(marks, 0);
			}
		},
		[clearHighlights, activateMatch],
	);

	// Navigate to next match
	const goToNext = useCallback(() => {
		if (highlightsRef.current.length === 0) {
			// If no search yet, perform search first
			if (searchText.trim()) {
				performSearch(searchText);
			}
			return;
		}

		const newIndex = currentMatch >= matchCount ? 1 : currentMatch + 1;
		setCurrentMatch(newIndex);
		activateMatch(highlightsRef.current, newIndex - 1);
	}, [currentMatch, matchCount, searchText, performSearch, activateMatch]);

	// Navigate to previous match
	const goToPrevious = useCallback(() => {
		if (highlightsRef.current.length === 0) {
			// If no search yet, perform search first
			if (searchText.trim()) {
				performSearch(searchText);
			}
			return;
		}

		const newIndex = currentMatch <= 1 ? matchCount : currentMatch - 1;
		setCurrentMatch(newIndex);
		activateMatch(highlightsRef.current, newIndex - 1);
	}, [currentMatch, matchCount, searchText, performSearch, activateMatch]);

	// Close and cleanup
	const closeFindBar = useCallback(() => {
		setIsVisible(false);
		setSearchText("");
		setHasSearched(false);
		clearHighlights();
	}, [clearHighlights]);

	// Listen for IPC events from main process
	useEffect(() => {
		if (!window.shadowquill?.find) return;

		const unsubShow = window.shadowquill.find.onShow(() => {
			setIsVisible(true);
			setTimeout(() => inputRef.current?.focus(), 50);
		});

		const unsubNext = window.shadowquill.find.onNext(() => {
			if (isVisible && searchText) {
				goToNext();
			}
		});

		const unsubPrevious = window.shadowquill.find.onPrevious(() => {
			if (isVisible && searchText) {
				goToPrevious();
			}
		});

		return () => {
			unsubShow();
			unsubNext();
			unsubPrevious();
		};
	}, [isVisible, searchText, goToNext, goToPrevious]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Escape closes the find bar
			if (e.key === "Escape" && isVisible) {
				e.preventDefault();
				closeFindBar();
				return;
			}

			// Enter in find bar triggers find
			if (
				e.key === "Enter" &&
				isVisible &&
				document.activeElement === inputRef.current
			) {
				e.preventDefault();
				if (e.shiftKey) {
					goToPrevious();
				} else {
					goToNext();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isVisible, closeFindBar, goToNext, goToPrevious]);

	// Clear highlights and reset search state when search text changes
	useEffect(() => {
		if (!searchText) {
			clearHighlights();
		}
		// Reset search state when text changes
		setHasSearched(false);
	}, [searchText, clearHighlights]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			clearHighlights();
		};
	}, [clearHighlights]);

	if (!isVisible) return null;

	return (
		<div
			data-find-bar
			className="fixed top-12 right-4 z-[9999] flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-2 backdrop-blur-2xl"
			style={{
				minWidth: 280,
				// No gradients — flat frosted surface
				background: "color-mix(in srgb, var(--color-surface) 65%, transparent)",
				boxShadow:
					"0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.15) inset, 0 -1px 0 rgba(0,0,0,0.1) inset",
			}}
		>
			<input
				ref={inputRef}
				type="text"
				value={searchText}
				onChange={(e) => setSearchText(e.target.value)}
				placeholder="Find in page..."
				className="flex-1 rounded-lg border border-white/10 px-3 py-1.5 text-[var(--color-on-surface)] text-sm outline-none transition-all placeholder:text-[var(--color-on-surface-variant)] focus:border-white/30 focus:ring-1 focus:ring-white/10"
				style={{
					background: "rgba(0, 0, 0, 0.25)",
					boxShadow:
						"inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.05)",
				}}
			/>

			{matchCount > 0 && searchText && (
				<span className="min-w-[60px] text-center text-[var(--color-on-surface-variant)] text-xs">
					{currentMatch}/{matchCount}
				</span>
			)}

			{matchCount === 0 && searchText && hasSearched && (
				<span className="min-w-[60px] text-center text-[var(--color-attention)] text-xs">
					No results
				</span>
			)}

			<button
				type="button"
				onClick={goToPrevious}
				disabled={!searchText}
				className="rounded p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:bg-surface-a20 hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-40"
				title="Previous (Shift+Enter)"
			>
				<ChevronUpIcon className="h-3 w-3" />
			</button>

			<button
				type="button"
				onClick={goToNext}
				disabled={!searchText}
				className="rounded p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:bg-surface-a20 hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-40"
				title="Next (Enter)"
			>
				<ChevronDownIcon className="h-3 w-3" />
			</button>

			<button
				type="button"
				onClick={closeFindBar}
				className="rounded p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:bg-surface-a20 hover:text-[var(--color-on-surface)]"
				title="Close (Escape)"
			>
				<XMarkIcon className="h-3 w-3" />
			</button>
		</div>
	);
}

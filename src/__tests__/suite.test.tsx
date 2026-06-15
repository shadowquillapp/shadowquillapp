/** ponytail: single vitest entry; chunks keep vi.mock from colliding */
import "@testing-library/jest-dom/vitest";

import.meta.glob("./_chunks/*", { eager: true });

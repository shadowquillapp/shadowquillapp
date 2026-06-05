import PromptWorkbench from "@/app/workbench/_components/PromptWorkbench";
import ModelConfigGate from "../../components/ModelConfigGate";

export default async function WorkbenchPage() {
	return (
		<main className="flex h-full w-[100vw] bg-[var(--color-surface)] text-[var(--color-on-surface)]">
			<ModelConfigGate>
				<div className="flex h-full w-full">
					<PromptWorkbench />
				</div>
			</ModelConfigGate>
		</main>
	);
}

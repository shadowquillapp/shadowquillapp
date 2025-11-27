import PromptWorkbench from "@/app/workbench/_components/PromptWorkbench";
import ModelConfigGate from "../../components/ModelConfigGate";

export default async function WorkbenchPage() {
	return (
		<main className="flex h-full w-[100vw] bg-surface-0 text-light">
			<ModelConfigGate>
				<div className="flex h-full w-full">
					<PromptWorkbench />
				</div>
			</ModelConfigGate>
		</main>
	);
}

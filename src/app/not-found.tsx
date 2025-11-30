import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="text-center">
				<h1 className="font-bold text-4xl text-gray-900 dark:text-gray-100">
					404
				</h1>
				<p className="mt-4 text-gray-600 text-lg dark:text-gray-400">
					Page not found
				</p>
				<Link
					href="/workbench"
					className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
				>
					Go to Workbench
				</Link>
			</div>
		</div>
	);
}

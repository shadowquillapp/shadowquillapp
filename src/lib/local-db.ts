import type { PromptProject, TestMessage } from "@/types";
import { getJSON, setJSON } from "./local-storage";

// Legacy storage interface with number timestamps
interface StoredTestMessage {
	id: string;
	projectId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: number;
}

interface StoredProject {
	id: string;
	userId: string;
	title: string | null;
	createdAt: number;
	updatedAt: number;
	versionGraph?: any;
}

const PROJECTS_KEY = "PC_PROJECTS";
const TEST_MESSAGES_KEY = "PC_TEST_MESSAGES";
const LOCAL_USER_ID = "local-user";

function readProjects(): Record<string, StoredProject> {
	return getJSON<Record<string, StoredProject>>(PROJECTS_KEY, {});
}
function writeProjects(map: Record<string, StoredProject>) {
	setJSON(PROJECTS_KEY, map);
}
function readTestMessages(): Record<string, StoredTestMessage> {
	return getJSON<Record<string, StoredTestMessage>>(TEST_MESSAGES_KEY, {});
}
function writeTestMessages(map: Record<string, StoredTestMessage>) {
	setJSON(TEST_MESSAGES_KEY, map);
}

export async function listProjectsByUser(
	userId: string = LOCAL_USER_ID,
): Promise<Array<PromptProject & { messageCount: number }>> {
	const projects = Object.values(readProjects()).filter((c) => c.userId === userId);
	const messages = Object.values(readTestMessages());
	return projects
		.map((c) => ({
			...c,
			createdAt: new Date(c.createdAt),
			updatedAt: new Date(c.updatedAt),
			messageCount: messages.filter((m) => m.projectId === c.id).length,
		}))
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function createProject(
	title?: string | null,
	userId: string = LOCAL_USER_ID,
): Promise<PromptProject> {
	const id = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = Date.now();
	const project: StoredProject = {
		id,
		userId,
		title: title ?? null,
		createdAt: now,
		updatedAt: now,
	};
	const map = readProjects();
	map[id] = project;
	writeProjects(map);
	return { ...project, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function appendMessagesWithCap(
	projectId: string,
	items: Array<{ role: "user" | "assistant"; content: string }>,
	cap: number,
): Promise<{ created: TestMessage[]; deletedIds: string[] }> {
	const now = Date.now();
	const messagesMap = readTestMessages();
	const created: TestMessage[] = [];
	for (const it of items) {
		const id = cryptoRandomId();
		const m: StoredTestMessage = {
			id,
			projectId,
			role: it.role,
			content: it.content,
			createdAt: now,
		};
		messagesMap[id] = m;
		created.push({ ...m, createdAt: new Date(m.createdAt) });
	}
	// enforce cap per project
	const projectMessages = Object.values(messagesMap)
		.filter((m) => m.projectId === projectId)
		.sort((a, b) => a.createdAt - b.createdAt);
	const over = projectMessages.length - cap;
	const deletedIds: string[] = [];
	if (over > 0) {
		for (let i = 0; i < over; i++) {
			const toDelete = projectMessages[i];
			if (!toDelete) continue;
			delete messagesMap[toDelete.id];
			deletedIds.push(toDelete.id);
		}
	}
	writeTestMessages(messagesMap);
	// update project timestamp
	const projects = readProjects();
	const project = projects[projectId];
	if (project) {
		project.updatedAt = Date.now();
		writeProjects(projects);
	}
	return { created, deletedIds };
}

export async function getProject(
	projectId: string,
	limit = 50,
): Promise<{ id: string; title: string | null; messages: TestMessage[]; versionGraph?: any }> {
	const projects = readProjects();
	const c = projects[projectId];
	const messages = Object.values(readTestMessages())
		.filter((m) => m.projectId === projectId)
		.sort((a, b) => a.createdAt - b.createdAt)
		.slice(-limit)
		.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
	return { id: projectId, title: c?.title ?? "Untitled", messages, versionGraph: c?.versionGraph };
}

export async function updateProjectVersionGraph(
	projectId: string,
	versionGraph: any,
): Promise<void> {
	const projects = readProjects();
	const project = projects[projectId];
	if (project) {
		project.versionGraph = versionGraph;
		project.updatedAt = Date.now();
		writeProjects(projects);
	}
}

export async function deleteProject(projectId: string): Promise<void> {
	const projects = readProjects();
	delete projects[projectId];
	writeProjects(projects);
	const messages = readTestMessages();
	for (const m of Object.values(messages)) {
		if (m.projectId === projectId) delete messages[m.id];
	}
	writeTestMessages(messages);
}

export async function deleteProjects(ids: string[]): Promise<void> {
	for (const id of ids) await deleteProject(id);
}

function cryptoRandomId(): string {
	try {
		const rnd = crypto.getRandomValues(new Uint32Array(2));
		const a = rnd[0] ?? 0;
		const b = rnd[1] ?? 0;
		return `msg-${Date.now()}-${a.toString(36)}${b.toString(36)}`;
	} catch {
		return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	}
}

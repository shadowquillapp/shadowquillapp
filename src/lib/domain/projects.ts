import type { ProjectMessage, PromptProject } from "@/types";
import { getRaw, setJSON } from "../local-storage";
import { isRecord, isString, safeParse } from "../schema";
import { STORAGE_KEYS } from "../storage-keys";

const LOCAL_USER_ID = "local-user";
let nextId = 0;

interface StoredProjectMessage {
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
	presetId?: string;
	createdAt: number;
	updatedAt: number;
	versionGraph?: unknown;
}

function readMap<T>(
	key: string,
	isValue: (v: unknown) => v is T,
): Record<string, T> {
	return safeParse(
		getRaw(key),
		(v): v is Record<string, T> =>
			isRecord(v) && Object.values(v).every(isValue),
		{},
	);
}

function readProjects(): Record<string, StoredProject> {
	return readMap(
		STORAGE_KEYS.PROJECTS.key,
		(v): v is StoredProject =>
			isRecord(v) &&
			isString(v.id) &&
			isString(v.userId) &&
			(v.title === null || isString(v.title)) &&
			typeof v.createdAt === "number" &&
			typeof v.updatedAt === "number",
	);
}

function writeProjects(map: Record<string, StoredProject>): void {
	setJSON(STORAGE_KEYS.PROJECTS.key, map);
}

function readProjectMessages(): Record<string, StoredProjectMessage> {
	return readMap(
		STORAGE_KEYS.TEST_MESSAGES.key,
		(v): v is StoredProjectMessage =>
			isRecord(v) &&
			isString(v.id) &&
			isString(v.projectId) &&
			(v.role === "user" || v.role === "assistant") &&
			isString(v.content) &&
			typeof v.createdAt === "number",
	);
}

function writeProjectsAndMessages(
	projects: Record<string, StoredProject>,
	messages: Record<string, StoredProjectMessage>,
): void {
	setJSON(STORAGE_KEYS.PROJECTS.key, projects);
	setJSON(STORAGE_KEYS.TEST_MESSAGES.key, messages);
}

function randomId(prefix: string): string {
	const seq = (nextId++).toString(36);
	try {
		const rnd = crypto.getRandomValues(new Uint32Array(2));
		const a = rnd[0] ?? 0;
		const b = rnd[1] ?? 0;
		return `${prefix}-${Date.now()}-${seq}${a.toString(36)}${b.toString(36)}`;
	} catch {
		return `${prefix}-${Date.now()}-${seq}${Math.random().toString(36).slice(2, 10)}`;
	}
}

export async function listProjectsByUser(
	userId: string = LOCAL_USER_ID,
): Promise<Array<PromptProject & { messageCount: number }>> {
	const projects = Object.values(readProjects()).filter(
		(p) => p.userId === userId,
	);
	const messages = Object.values(readProjectMessages());
	return projects
		.map((p) => ({
			...p,
			createdAt: new Date(p.createdAt),
			updatedAt: new Date(p.updatedAt),
			messageCount: messages.filter((m) => m.projectId === p.id).length,
		}))
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function createProject(
	title?: string | null,
	userId: string = LOCAL_USER_ID,
	presetId?: string,
): Promise<PromptProject> {
	const id = randomId("project");
	const now = Date.now();
	const project: StoredProject = {
		id,
		userId,
		title: title ?? null,
		...(presetId !== undefined && { presetId }),
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
): Promise<{ created: ProjectMessage[]; deletedIds: string[] }> {
	const now = Date.now();
	const messagesMap = readProjectMessages();
	const created: ProjectMessage[] = [];
	for (let i = 0; i < items.length; i++) {
		const it = items[i];
		if (!it) continue;
		const id = randomId("msg");
		const m: StoredProjectMessage = {
			id,
			projectId,
			role: it.role,
			content: it.content,
			createdAt: now + i,
		};
		messagesMap[id] = m;
		created.push({ ...m, createdAt: new Date(m.createdAt) });
	}
	const projectMessages = Object.values(messagesMap)
		.filter((m) => m.projectId === projectId)
		.sort((a, b) => a.createdAt - b.createdAt);
	const over = Math.max(0, projectMessages.length - cap);
	const deletedIds: string[] = [];
	for (const toDelete of projectMessages.slice(0, over)) {
		delete messagesMap[toDelete.id];
		deletedIds.push(toDelete.id);
	}
	const projects = readProjects();
	const project = projects[projectId];
	if (project) {
		project.updatedAt = now;
		projects[projectId] = project;
	}
	writeProjectsAndMessages(projects, messagesMap);
	return { created, deletedIds };
}

export async function getProject(
	projectId: string,
	limit = 50,
): Promise<{
	id: string;
	title: string | null;
	messages: ProjectMessage[];
	versionGraph?: unknown;
	presetId?: string;
}> {
	const projects = readProjects();
	const c = projects[projectId];
	const messages = Object.values(readProjectMessages())
		.filter((m) => m.projectId === projectId)
		.sort((a, b) => a.createdAt - b.createdAt)
		.slice(-limit)
		.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
	return {
		id: projectId,
		title: c?.title ?? "Untitled",
		messages,
		versionGraph: c?.versionGraph,
		...(c?.presetId !== undefined && { presetId: c.presetId }),
	};
}

export async function updateProjectVersionGraph(
	projectId: string,
	versionGraph: unknown,
): Promise<void> {
	const projects = readProjects();
	const project = projects[projectId];
	if (project) {
		project.versionGraph = versionGraph;
		project.updatedAt = Date.now();
		projects[projectId] = project;
		writeProjects(projects);
	}
}

export async function deleteProject(projectId: string): Promise<void> {
	const projects = readProjects();
	delete projects[projectId];
	const messages = readProjectMessages();
	for (const m of Object.values(messages)) {
		if (m.projectId === projectId) delete messages[m.id];
	}
	writeProjectsAndMessages(projects, messages);
}

export async function deleteProjects(ids: string[]): Promise<void> {
	for (const id of ids) await deleteProject(id);
}

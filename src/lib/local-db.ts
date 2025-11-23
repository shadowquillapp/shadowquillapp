import type { Chat, ChatMessage } from "@/types";
import { getJSON, setJSON } from "./local-storage";

// Legacy storage interface with number timestamps
interface StoredMessage {
	id: string;
	chatId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: number;
}

interface StoredChat {
	id: string;
	userId: string;
	title: string | null;
	createdAt: number;
	updatedAt: number;
	versionGraph?: any;
}

const CHATS_KEY = "PC_CHATS";
const MESSAGES_KEY = "PC_MESSAGES";
const LOCAL_USER_ID = "local-user";

function readChats(): Record<string, StoredChat> {
	return getJSON<Record<string, StoredChat>>(CHATS_KEY, {});
}
function writeChats(map: Record<string, StoredChat>) {
	setJSON(CHATS_KEY, map);
}
function readMessages(): Record<string, StoredMessage> {
	return getJSON<Record<string, StoredMessage>>(MESSAGES_KEY, {});
}
function writeMessages(map: Record<string, StoredMessage>) {
	setJSON(MESSAGES_KEY, map);
}

export async function listChatsByUser(
	userId: string = LOCAL_USER_ID,
): Promise<Array<Chat & { messageCount: number }>> {
	const chats = Object.values(readChats()).filter((c) => c.userId === userId);
	const messages = Object.values(readMessages());
	return chats
		.map((c) => ({
			...c,
			createdAt: new Date(c.createdAt),
			updatedAt: new Date(c.updatedAt),
			messageCount: messages.filter((m) => m.chatId === c.id).length,
		}))
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function createChat(
	title?: string | null,
	userId: string = LOCAL_USER_ID,
): Promise<Chat> {
	const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = Date.now();
	const chat: StoredChat = {
		id,
		userId,
		title: title ?? null,
		createdAt: now,
		updatedAt: now,
	};
	const map = readChats();
	map[id] = chat;
	writeChats(map);
	return { ...chat, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function appendMessagesWithCap(
	chatId: string,
	items: Array<{ role: "user" | "assistant"; content: string }>,
	cap: number,
): Promise<{ created: ChatMessage[]; deletedIds: string[] }> {
	const now = Date.now();
	const messagesMap = readMessages();
	const created: ChatMessage[] = [];
	for (const it of items) {
		const id = cryptoRandomId();
		const m: StoredMessage = {
			id,
			chatId,
			role: it.role,
			content: it.content,
			createdAt: now,
		};
		messagesMap[id] = m;
		created.push({ ...m, createdAt: new Date(m.createdAt) });
	}
	// enforce cap per chat
	const chatMessages = Object.values(messagesMap)
		.filter((m) => m.chatId === chatId)
		.sort((a, b) => a.createdAt - b.createdAt);
	const over = chatMessages.length - cap;
	const deletedIds: string[] = [];
	if (over > 0) {
		for (let i = 0; i < over; i++) {
			const toDelete = chatMessages[i];
			if (!toDelete) continue;
			delete messagesMap[toDelete.id];
			deletedIds.push(toDelete.id);
		}
	}
	writeMessages(messagesMap);
	// update chat timestamp
	const chats = readChats();
	const chat = chats[chatId];
	if (chat) {
		chat.updatedAt = Date.now();
		writeChats(chats);
	}
	return { created, deletedIds };
}

export async function getChat(
	chatId: string,
	limit = 50,
): Promise<{ id: string; title: string | null; messages: ChatMessage[]; versionGraph?: any }> {
	const chats = readChats();
	const c = chats[chatId];
	const messages = Object.values(readMessages())
		.filter((m) => m.chatId === chatId)
		.sort((a, b) => a.createdAt - b.createdAt)
		.slice(-limit)
		.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
	return { id: chatId, title: c?.title ?? "Untitled", messages, versionGraph: c?.versionGraph };
}

export async function updateChatVersionGraph(
	chatId: string,
	versionGraph: any,
): Promise<void> {
	const chats = readChats();
	const chat = chats[chatId];
	if (chat) {
		chat.versionGraph = versionGraph;
		chat.updatedAt = Date.now();
		writeChats(chats);
	}
}

export async function deleteChat(chatId: string): Promise<void> {
	const chats = readChats();
	delete chats[chatId];
	writeChats(chats);
	const messages = readMessages();
	for (const m of Object.values(messages)) {
		if (m.chatId === chatId) delete messages[m.id];
	}
	writeMessages(messages);
}

export async function deleteChats(ids: string[]): Promise<void> {
	for (const id of ids) await deleteChat(id);
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

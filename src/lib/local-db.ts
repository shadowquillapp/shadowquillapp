import { getJSON, setJSON } from "./local-storage";

export interface Message {
	id: string;
	chatId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: number;
}

export interface Chat {
	id: string;
	userId: string;
	title: string | null;
	createdAt: number;
	updatedAt: number;
}

const CHATS_KEY = "PC_CHATS";
const MESSAGES_KEY = "PC_MESSAGES";
const LOCAL_USER_ID = "local-user";

function readChats(): Record<string, Chat> {
	return getJSON<Record<string, Chat>>(CHATS_KEY, {});
}
function writeChats(map: Record<string, Chat>) {
	setJSON(CHATS_KEY, map);
}
function readMessages(): Record<string, Message> {
	return getJSON<Record<string, Message>>(MESSAGES_KEY, {});
}
function writeMessages(map: Record<string, Message>) {
	setJSON(MESSAGES_KEY, map);
}

export async function listChatsByUser(userId: string = LOCAL_USER_ID): Promise<Array<Chat & { messageCount: number }>> {
	const chats = Object.values(readChats()).filter((c) => c.userId === userId);
	const messages = Object.values(readMessages());
	return chats
		.map((c) => ({ ...c, messageCount: messages.filter((m) => m.chatId === c.id).length }))
		.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createChat(title?: string | null, userId: string = LOCAL_USER_ID): Promise<Chat> {
	const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = Date.now();
	const chat: Chat = { id, userId, title: title ?? null, createdAt: now, updatedAt: now };
	const map = readChats();
	map[id] = chat;
	writeChats(map);
	return chat;
}

export async function appendMessagesWithCap(
	chatId: string,
	items: Array<{ role: "user" | "assistant"; content: string }>,
	cap: number,
): Promise<{ created: Message[]; deletedIds: string[] }> {
	const now = Date.now();
	const messagesMap = readMessages();
	const created: Message[] = [];
	for (const it of items) {
		const id = cryptoRandomId();
		const m: Message = { id, chatId, role: it.role, content: it.content, createdAt: now };
		messagesMap[id] = m;
		created.push(m);
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
	if (chats[chatId]) {
		chats[chatId].updatedAt = Date.now();
		writeChats(chats);
	}
	return { created, deletedIds };
}

export async function getChat(chatId: string, limit: number = 50): Promise<{ id: string; title: string | null; messages: Message[] }> {
	const chats = readChats();
	const c = chats[chatId];
	const messages = Object.values(readMessages())
		.filter((m) => m.chatId === chatId)
		.sort((a, b) => a.createdAt - b.createdAt)
		.slice(-limit);
	return { id: chatId, title: c?.title ?? "Untitled", messages };
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



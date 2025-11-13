import { JSONStore } from './json-store';
import crypto from 'crypto';

// Data models
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptPreset {
  id: string;
  userId: string;
  name: string;
  taskType: string;
  options: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chat {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date;
}


// Storage instances (users are in-memory only; no users.json persisted)
const inMemoryUsers = new Map<string, User>();
const appSettingStore = new JSONStore<AppSetting>('app-settings');
const promptPresetStore = new JSONStore<PromptPreset>('prompt-presets');
const chatStore = new JSONStore<Chat>('chats');
const chatMessageStore = new JSONStore<ChatMessage>('chat-messages');

// Repair corrupted app-settings.json file on initialization
appSettingStore.repairCorruptedFile().catch(console.error);

// Database replacement class
export class DataLayer {
  // User operations
  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const user: User = { ...data, id: `user-${Date.now()}`, createdAt: now, updatedAt: now };
    inMemoryUsers.set(user.id, user);
    return user;
  }

  async findUserById(id: string): Promise<User | null> {
    return inMemoryUsers.get(id) || null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const u of inMemoryUsers.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  async upsertUser(data: Partial<User> & { id: string }): Promise<User> {
    const existing = await this.findUserById(data.id);
    const now = new Date();
    const user: User = {
      id: data.id,
      name: data.name ?? existing?.name ?? 'Local User',
      email: data.email ?? existing?.email ?? null,
      emailVerified: existing?.emailVerified ?? null,
      image: data.image ?? existing?.image ?? null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    inMemoryUsers.set(user.id, user);
    return user;
  }

  // App Settings operations
  async findAppSetting(key: string): Promise<AppSetting | null> {
    console.log(`[data-layer] Finding app setting: ${key}`);
    const settings = await appSettingStore.findMany(setting => setting.key === key);
    console.log(`[data-layer] Found setting for ${key}:`, settings[0] || null);
    return settings[0] || null;
  }

  async findManyAppSettings(keys: string[]): Promise<AppSetting[]> {
    console.log(`[data-layer] Finding multiple app settings:`, keys);
    const results = await appSettingStore.findMany(setting => keys.includes(setting.key));
    console.log(`[data-layer] Found ${results.length} settings`);
    return results;
  }

  async upsertAppSetting(key: string, value: string | null): Promise<AppSetting> {
    console.log(`[data-layer] Upserting app setting: ${key} = ${value}`);
    const existing = await this.findAppSetting(key);
    const now = new Date();
    
    const setting: AppSetting = {
      id: existing?.id || `setting-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      key,
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    
    console.log(`[data-layer] Upserting setting with id: ${setting.id}`);
    await appSettingStore.upsert(setting.id, setting);
    console.log(`[data-layer] Successfully upserted setting: ${key}`);
    return setting;
  }

  async deleteAppSettings(keys: string[]): Promise<void> {
    const settings = await appSettingStore.findMany(setting => keys.includes(setting.key));
    for (const setting of settings) {
      await appSettingStore.delete(setting.id);
    }
  }

  // Chat operations
  async createChat(data: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
    try {
      const now = new Date();
      const chat: Chat = {
        ...data,
        id: `chat-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      await chatStore.upsert(chat.id, chat);
      console.log(`Created chat ${chat.id} for user ${chat.userId}`);
      return chat;
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    }
  }

  async findChatById(id: string): Promise<Chat | null> {
    try {
      return await chatStore.findById(id);
    } catch (error) {
      console.error(`Failed to find chat ${id}:`, error);
      return null;
    }
  }

  async findChatsByUserId(userId: string): Promise<Array<Chat & { messageCount: number }>> {
    try {
      const chats = await chatStore.findMany(chat => chat.userId === userId);
      const chatsWithCounts = await Promise.all(
        chats.map(async (chat) => {
          const messageCount = await chatMessageStore.count(msg => msg.chatId === chat.id);
          return { ...chat, messageCount };
        })
      );
      
      const sorted = chatsWithCounts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      console.log(`Found ${sorted.length} chats for user ${userId}`);
      return sorted;
    } catch (error) {
      console.error(`Failed to find chats for user ${userId}:`, error);
      return [];
    }
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat | null> {
    try {
      const updated = await chatStore.update(id, { ...data, updatedAt: new Date() });
      if (updated) {
        console.log(`Updated chat ${id}`);
      }
      return updated;
    } catch (error) {
      console.error(`Failed to update chat ${id}:`, error);
      return null;
    }
  }

  async deleteChat(id: string): Promise<boolean> {
    try {
      // Delete all messages in the chat first
      const messages = await chatMessageStore.findMany(msg => msg.chatId === id);
      for (const message of messages) {
        await chatMessageStore.delete(message.id);
      }
      
      const deleted = await chatStore.delete(id);
      if (deleted) {
        console.log(`Deleted chat ${id} and ${messages.length} messages`);
      }
      return deleted;
    } catch (error) {
      console.error(`Failed to delete chat ${id}:`, error);
      return false;
    }
  }

  // Chat Message operations
  async createChatMessages(messages: Array<Omit<ChatMessage, 'id' | 'createdAt'>>): Promise<ChatMessage[]> {
    try {
      const now = new Date();
      const createdMessages: ChatMessage[] = [];
      
      for (const msgData of messages) {
        const message: ChatMessage = {
          ...msgData,
          id: crypto.randomUUID(),
          createdAt: now,
        };
        
        await chatMessageStore.upsert(message.id, message);
        
        createdMessages.push(message);
      }
      
      console.log(`Created ${createdMessages.length} messages for chat ${messages[0]?.chatId}`);
      return createdMessages;
    } catch (error) {
      console.error('Failed to create chat messages:', error);
      throw error;
    }
  }

  // Atomically append messages to a chat and trim to cap within a single critical section on the messages store
  async appendMessagesWithCap(chatId: string, messages: Array<Omit<ChatMessage, 'id' | 'createdAt' | 'chatId'>>, cap: number): Promise<{ created: ChatMessage[]; deletedIds: string[] }> {
    const now = new Date();
    const created: ChatMessage[] = [];
    const deletedIds: string[] = [];
    // Perform all message mutations under a single file lock to avoid races
    await (chatMessageStore as any).mutate(async (store: any) => {
      // Append
      for (const msgData of messages) {
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          chatId,
          role: msgData.role,
          content: msgData.content,
          createdAt: now,
        };
        store.data[message.id] = message as any;
        created.push(message);
      }
      // Enforce cap by trimming oldest
      const all = Object.entries(store.data)
        .map(([id, m]: [string, any]) => ({ ...(m as any), id }))
        .filter((m: any) => m.chatId === chatId)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const over = all.length - cap;
      if (over > 0) {
        const toRemove = all.slice(0, over);
        for (const m of toRemove) {
          delete store.data[m.id];
          deletedIds.push(m.id);
        }
      }
    });
    // Post-mutation: update chat timestamp (separate file, best-effort)
    await this.updateChat(chatId, { updatedAt: new Date() });
    return { created, deletedIds };
  }

  async findChatMessages(chatId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const messages = await chatMessageStore.findMany(msg => msg.chatId === chatId);
      const sorted = messages
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(-limit);
      
      console.log(`Found ${sorted.length} messages for chat ${chatId}`);
      return sorted;
    } catch (error) {
      console.error(`Failed to find messages for chat ${chatId}:`, error);
      return [];
    }
  }

  async countChatMessages(chatId: string): Promise<number> {
    try {
      return await chatMessageStore.count(msg => msg.chatId === chatId);
    } catch (error) {
      console.error(`Failed to count messages for chat ${chatId}:`, error);
      return 0;
    }
  }

  async deleteChatMessages(messageIds: string[]): Promise<void> {
    try {
      for (const id of messageIds) {
        await chatMessageStore.delete(id);
      }
      console.log(`Deleted ${messageIds.length} messages`);
    } catch (error) {
      console.error('Failed to delete chat messages:', error);
      throw error;
    }
  }

  // Prompt Preset operations
  async createPreset(data: Omit<PromptPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptPreset> {
    const now = new Date();
    const preset: PromptPreset = {
      ...data,
      id: `preset-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    await promptPresetStore.upsert(preset.id, preset);
    return preset;
  }

  async findPresetById(id: string): Promise<PromptPreset | null> {
    return await promptPresetStore.findById(id);
  }

  async findPresetsByUserId(userId: string): Promise<PromptPreset[]> {
    return await promptPresetStore.findMany(preset => preset.userId === userId);
  }

  async updatePreset(id: string, data: Partial<PromptPreset>): Promise<PromptPreset | null> {
    return await promptPresetStore.update(id, { ...data, updatedAt: new Date() });
  }

  async deletePreset(id: string): Promise<boolean> {
    return await promptPresetStore.delete(id);
  }


  // Initialize with default local user
  async ensureLocalUser(): Promise<User> {
    const localUserId = 'local-user';
    const existing = inMemoryUsers.get(localUserId);
    if (existing) return existing;
    const now = new Date();
    const user: User = { id: localUserId, name: 'Local User', email: null, emailVerified: null, image: null, createdAt: now, updatedAt: now };
    inMemoryUsers.set(localUserId, user);
    return user;
  }
}

// Export singleton instance
export const dataLayer = new DataLayer();

// Backward compatibility - simulate interface
export const db = {
  user: {
    findUnique: ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) return dataLayer.findUserById(where.id);
      if (where.email) return dataLayer.findUserByEmail(where.email);
      return null;
    },
    upsert: ({ where, create, update }: any) => {
      return dataLayer.upsertUser({ ...create, ...update, id: where.id });
    },
  },
  appSetting: {
    findUnique: ({ where }: { where: { key: string } }) => 
      dataLayer.findAppSetting(where.key),
    findMany: ({ where }: { where?: { key?: { in: string[] } } } = {}) => {
      if (where?.key?.in) return dataLayer.findManyAppSettings(where.key.in);
      return [];
    },
    upsert: ({ where, create, update }: any) => 
      dataLayer.upsertAppSetting(where.key, update?.value ?? create?.value),
    deleteMany: ({ where }: { where: { key: string } }) => 
      dataLayer.deleteAppSettings([where.key]),
  },
  chat: {
    create: ({ data }: { data: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'> }) => 
      dataLayer.createChat(data),
    findFirst: ({ where }: { where: { id: string; userId?: string } }) =>
      dataLayer.findChatById(where.id),
    findMany: ({ where, orderBy }: any) => 
      dataLayer.findChatsByUserId(where.userId),
    update: ({ where, data }: { where: { id: string }, data: Partial<Chat> }) =>
      dataLayer.updateChat(where.id, data),
    delete: ({ where }: { where: { id: string } }) =>
      dataLayer.deleteChat(where.id),
  },
  chatMessage: {
    createMany: ({ data }: { data: Array<Omit<ChatMessage, 'id' | 'createdAt'>> }) =>
      dataLayer.createChatMessages(data),
    findMany: ({ where, orderBy, take }: any) =>
      dataLayer.findChatMessages(where.chatId, take),
    count: ({ where }: { where: { chatId: string } }) =>
      dataLayer.countChatMessages(where.chatId),
    deleteMany: ({ where }: { where: { id: { in: string[] } } }) =>
      dataLayer.deleteChatMessages(where.id.in),
  },
};

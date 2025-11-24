import { JSONStore } from './json-store';
import crypto from 'crypto';
import type { AppSetting, PromptProject, TestMessage, PromptPreset } from '@/types';
import { logger } from '../logging';

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

// Storage instances (users are in-memory only; no users.json persisted)
const inMemoryUsers = new Map<string, User>();
const appSettingStore = new JSONStore<AppSetting>('app-settings');
const promptPresetStore = new JSONStore<PromptPreset>('prompt-presets');
const projectStore = new JSONStore<PromptProject>('projects');
const testMessageStore = new JSONStore<TestMessage>('test-messages');

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
    logger.debug(`[data-layer] Finding app setting: ${key}`);
    const settings = await appSettingStore.findMany(setting => setting.key === key);
    logger.debug(`[data-layer] Found setting for ${key}:`, { setting: settings[0] || null });
    return settings[0] || null;
  }

  async findManyAppSettings(keys: string[]): Promise<AppSetting[]> {
    logger.debug(`[data-layer] Finding multiple app settings:`, { keys });
    const results = await appSettingStore.findMany(setting => keys.includes(setting.key));
    logger.debug(`[data-layer] Found ${results.length} settings`);
    return results;
  }

  async upsertAppSetting(key: string, value: string | null): Promise<AppSetting> {
    logger.debug(`[data-layer] Upserting app setting: ${key} = ${value}`);
    const existing = await this.findAppSetting(key);
    const now = new Date();
    
    const setting: AppSetting = {
      id: existing?.id || `setting-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      key,
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    
    logger.debug(`[data-layer] Upserting setting with id: ${setting.id}`);
    await appSettingStore.upsert(setting.id, setting);
    logger.info(`[data-layer] Successfully upserted setting: ${key}`);
    return setting;
  }

  async deleteAppSettings(keys: string[]): Promise<void> {
    const settings = await appSettingStore.findMany(setting => keys.includes(setting.key));
    for (const setting of settings) {
      await appSettingStore.delete(setting.id);
    }
  }

  // Prompt Project operations
  async createProject(data: Omit<PromptProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptProject> {
    try {
      const now = new Date();
      const project: PromptProject = {
        ...data,
        id: `project-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      await projectStore.upsert(project.id, project);
      logger.info(`Created project ${project.id} for user ${project.userId}`);
      return project;
    } catch (error) {
      logger.error('Failed to create project:', undefined, error as Error);
      throw error;
    }
  }

  async findProjectById(id: string): Promise<PromptProject | null> {
    try {
      return await projectStore.findById(id);
    } catch (error) {
      logger.error(`Failed to find project ${id}:`, undefined, error as Error);
      return null;
    }
  }

  async findProjectsByUserId(userId: string): Promise<Array<PromptProject & { messageCount: number }>> {
    try {
      const projects = await projectStore.findMany(project => project.userId === userId);
      const projectsWithCounts = await Promise.all(
        projects.map(async (project) => {
          const messageCount = await testMessageStore.count(msg => msg.projectId === project.id);
          return { ...project, messageCount };
        })
      );
      
      const sorted = projectsWithCounts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      logger.debug(`Found ${sorted.length} projects for user ${userId}`);
      return sorted;
    } catch (error) {
      logger.error(`Failed to find projects for user ${userId}:`, undefined, error as Error);
      return [];
    }
  }

  async updateProject(id: string, data: Partial<PromptProject>): Promise<PromptProject | null> {
    try {
      const updated = await projectStore.update(id, { ...data, updatedAt: new Date() });
      if (updated) {
        logger.info(`Updated project ${id}`);
      }
      return updated;
    } catch (error) {
      logger.error(`Failed to update project ${id}:`, undefined, error as Error);
      return null;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      // Delete all messages in the project first
      const messages = await testMessageStore.findMany(msg => msg.projectId === id);
      for (const message of messages) {
        await testMessageStore.delete(message.id);
      }
      
      const deleted = await projectStore.delete(id);
      if (deleted) {
        logger.info(`Deleted project ${id} and ${messages.length} messages`);
      }
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete project ${id}:`, undefined, error as Error);
      return false;
    }
  }

  // Test Message operations
  async createTestMessages(messages: Array<Omit<TestMessage, 'id' | 'createdAt'>>): Promise<TestMessage[]> {
    try {
      const now = new Date();
      const createdMessages: TestMessage[] = [];
      
      for (const msgData of messages) {
        const message: TestMessage = {
          ...msgData,
          id: crypto.randomUUID(),
          createdAt: now,
        };
        
        await testMessageStore.upsert(message.id, message);
        
        createdMessages.push(message);
      }
      
      logger.info(`Created ${createdMessages.length} messages for project ${messages[0]?.projectId}`);
      return createdMessages;
    } catch (error) {
      logger.error('Failed to create test messages:', undefined, error as Error);
      throw error;
    }
  }

  // Atomically append messages to a project and trim to cap within a single critical section on the messages store
  async appendMessagesWithCap(projectId: string, messages: Array<Omit<TestMessage, 'id' | 'createdAt' | 'projectId'>>, cap: number): Promise<{ created: TestMessage[]; deletedIds: string[] }> {
    const now = new Date();
    const created: TestMessage[] = [];
    const deletedIds: string[] = [];
    // Perform all message mutations under a single file lock to avoid races
    await (testMessageStore as any).mutate(async (store: any) => {
      // Append
      for (const msgData of messages) {
        const message: TestMessage = {
          id: crypto.randomUUID(),
          projectId,
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
        .filter((m: any) => m.projectId === projectId)
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
    // Post-mutation: update project timestamp (separate file, best-effort)
    await this.updateProject(projectId, { updatedAt: new Date() });
    return { created, deletedIds };
  }

  async findTestMessages(projectId: string, limit: number = 50): Promise<TestMessage[]> {
    try {
      const messages = await testMessageStore.findMany(msg => msg.projectId === projectId);
      const sorted = messages
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(-limit);
      
      logger.debug(`Found ${sorted.length} messages for project ${projectId}`);
      return sorted;
    } catch (error) {
      logger.error(`Failed to find messages for project ${projectId}:`, undefined, error as Error);
      return [];
    }
  }

  async countTestMessages(projectId: string): Promise<number> {
    try {
      return await testMessageStore.count(msg => msg.projectId === projectId);
    } catch (error) {
      logger.error(`Failed to count messages for project ${projectId}:`, undefined, error as Error);
      return 0;
    }
  }

  async deleteTestMessages(messageIds: string[]): Promise<void> {
    try {
      for (const id of messageIds) {
        await testMessageStore.delete(id);
      }
      logger.info(`Deleted ${messageIds.length} messages`);
    } catch (error) {
      logger.error('Failed to delete test messages:', undefined, error as Error);
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
  project: {
    create: ({ data }: { data: Omit<PromptProject, 'id' | 'createdAt' | 'updatedAt'> }) => 
      dataLayer.createProject(data),
    findFirst: ({ where }: { where: { id: string; userId?: string } }) =>
      dataLayer.findProjectById(where.id),
    findMany: ({ where, orderBy }: any) => 
      dataLayer.findProjectsByUserId(where.userId),
    update: ({ where, data }: { where: { id: string }, data: Partial<PromptProject> }) =>
      dataLayer.updateProject(where.id, data),
    delete: ({ where }: { where: { id: string } }) =>
      dataLayer.deleteProject(where.id),
  },
  testMessage: {
    createMany: ({ data }: { data: Array<Omit<TestMessage, 'id' | 'createdAt'>> }) =>
      dataLayer.createTestMessages(data),
    findMany: ({ where, orderBy, take }: any) =>
      dataLayer.findTestMessages(where.projectId, take),
    count: ({ where }: { where: { projectId: string } }) =>
      dataLayer.countTestMessages(where.projectId),
    deleteMany: ({ where }: { where: { id: { in: string[] } } }) =>
      dataLayer.deleteTestMessages(where.id.in),
  },
};

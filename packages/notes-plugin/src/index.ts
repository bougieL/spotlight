import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { pluginRegistry } from '@spotlight/plugin-registry';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const notesIconUrl = new URL('./assets/icons/file-text.svg', import.meta.url).href;

const STORAGE_KEY = 'notes_data';
const PLUGIN_NAME = 'notes';
const ACTION_OPEN = 'open';

export interface Note {
  id: string;
  categoryId: string | null;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface NotesData {
  categories: Category[];
  notes: Note[];
  activeNoteId: string | null;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export class NotesPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['notes'] ?? 'Notes';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.notes'];
  }
  pluginId = 'notes-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(PLUGIN_NAME);

  constructor() {
    super();
    pluginRegistry.registerAction({
      pluginName: PLUGIN_NAME,
      actionId: ACTION_OPEN,
      handler: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
    });
  }

  async getNotesData(): Promise<NotesData> {
    const data = await this.storage.get<NotesData>(STORAGE_KEY, {
      categories: [],
      notes: [],
      activeNoteId: null,
    });
    return data;
  }

  async saveNotesData(data: NotesData): Promise<void> {
    await this.storage.set(STORAGE_KEY, data);
  }

  async createCategory(name: string): Promise<Category> {
    const data = await this.getNotesData();
    const category: Category = {
      id: generateId(),
      name,
      createdAt: Date.now(),
    };
    data.categories.push(category);
    await this.saveNotesData(data);
    return category;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const data = await this.getNotesData();
    data.categories = data.categories.filter(c => c.id !== categoryId);
    data.notes = data.notes.map(note => {
      if (note.categoryId === categoryId) {
        return { ...note, categoryId: null };
      }
      return note;
    });
    if (data.activeNoteId) {
      const activeNote = data.notes.find(n => n.id === data.activeNoteId);
      if (activeNote && activeNote.categoryId === categoryId) {
        data.activeNoteId = null;
      }
    }
    await this.saveNotesData(data);
  }

  async createNote(categoryId: string | null = null): Promise<Note> {
    const data = await this.getNotesData();
    const note: Note = {
      id: generateId(),
      categoryId,
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    data.notes.push(note);
    data.activeNoteId = note.id;
    await this.saveNotesData(data);
    return note;
  }

  async updateNote(noteId: string, updates: Partial<Pick<Note, 'title' | 'content' | 'categoryId'>>): Promise<void> {
    const data = await this.getNotesData();
    const noteIndex = data.notes.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      data.notes[noteIndex] = {
        ...data.notes[noteIndex],
        ...updates,
        updatedAt: Date.now(),
      };
      await this.saveNotesData(data);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    const data = await this.getNotesData();
    data.notes = data.notes.filter(n => n.id !== noteId);
    if (data.activeNoteId === noteId) {
      data.activeNoteId = null;
    }
    await this.saveNotesData(data);
  }

  async setActiveNote(noteId: string | null): Promise<void> {
    const data = await this.getNotesData();
    data.activeNoteId = noteId;
    await this.saveNotesData(data);
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywords = [
      'note', 'notes', '笔记', 'note',
      'markdown', 'md', '文档', 'document'
    ];

    const isKeywordMatch = keywords.some(
      kw => kw.includes(query) || query.includes(kw)
    );

    if (!isKeywordMatch && query.length > 0) {
      return [];
    }

    return [
      {
        iconUrl: notesIconUrl,
        title: this.name,
        score: 900,
        sourcePlugin: PLUGIN_NAME,
        actionId: ACTION_OPEN,
        actionData: null,
        action: async (ctx: SearchResultItemContext) => {
          const component = await this.render({ query: params.query });
          if (component) {
            ctx.setPanel(component, this.name);
          }
        },
      },
    ];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/NotesPanel.vue'));
  }
}

export const notesPlugin = new NotesPlugin();

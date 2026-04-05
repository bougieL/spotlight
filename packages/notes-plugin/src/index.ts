import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import { generateId } from '@spotlight/utils';
import type { Note, Category, NotesData } from './types';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const notesIconUrl = new URL('./assets/notes.svg', import.meta.url).href;

const STORAGE_KEY = 'notes_data';
const ACTION_OPEN = 'open';

class NotesPlugin extends BasePlugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('notes.name');
  }
  get description(): string | undefined {
    return this.i18n.t('notes.description');
  }
  iconUrl = notesIconUrl;
  pluginId = 'notes-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
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
      { keyword: 'note', normalized: normalizeForSearch('note') },
      { keyword: 'notes', normalized: normalizeForSearch('notes') },
      { keyword: '笔记', normalized: normalizeForSearch('笔记'), pinyinInitials: toPinyinInitials('笔记') },
      { keyword: 'markdown', normalized: normalizeForSearch('markdown') },
      { keyword: 'md', normalized: normalizeForSearch('md') },
      { keyword: '文档', normalized: normalizeForSearch('文档'), pinyinInitials: toPinyinInitials('文档') },
      { keyword: 'document', normalized: normalizeForSearch('document') },
    ];

    if (query.length > 0 && !matchKeyword(query, keywords)) {
      return [];
    }

    return [
      {
        iconUrl: notesIconUrl,
        title: this.name,
        score: 900,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: null,
      },
    ];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/NotesPanel.vue') },
    ];
  }
}

const notesPlugin = new NotesPlugin();
export default notesPlugin;

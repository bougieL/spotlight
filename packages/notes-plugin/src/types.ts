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

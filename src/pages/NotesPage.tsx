import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { PenLine, Search, Tag, Trash2, Calendar, Star, Clock, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '@/components/Modal';
import { motion } from 'framer-motion';

interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  priority: NotePriority;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
}

type NoteCategory = 'Task' | 'Issue' | 'Reminder' | 'General';
type NotePriority = 'Low' | 'Medium' | 'High';

const NotesPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState<Partial<Note>>({
    title: '',
    content: '',
    category: 'General',
    priority: 'Medium',
    isPinned: false
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [viewNote, setViewNote] = useState<Note | null>(null);

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const categories: { type: NoteCategory; icon: React.ReactNode; color: string }[] = [
    { type: 'Task', icon: <Clock size={16} />, color: 'bg-blue-50 text-blue-600' },
    { type: 'Issue', icon: <AlertCircle size={16} />, color: 'bg-red-50 text-red-600' },
    { type: 'Reminder', icon: <Calendar size={16} />, color: 'bg-yellow-50 text-yellow-600' },
    { type: 'General', icon: <FileText size={16} />, color: 'bg-gray-50 text-gray-600' }
  ];

  const priorities: { level: NotePriority; color: string }[] = [
    { level: 'Low', color: 'bg-gray-50 text-gray-600' },
    { level: 'Medium', color: 'bg-yellow-50 text-yellow-600' },
    { level: 'High', color: 'bg-red-50 text-red-600' }
  ];

  const handleCreateNote = () => {
    setEditingNote(null);
    setNewNote({
      title: '',
      content: '',
      category: 'General',
      priority: 'Medium',
      isPinned: false
    });
    setIsModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNewNote(note);
    setIsModalOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    setDeleteNoteId(noteId);
    setIsDeleteConfirmOpen(true);
  };

  const handleTogglePin = (noteId: string) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentTime = new Date().toISOString();
    
    if (editingNote) {
      // Update existing note
      setNotes(prev => prev.map(note =>
        note.id === editingNote.id
          ? {
              ...note,
              ...newNote,
              updatedAt: currentTime
            }
          : note
      ));
    } else {
      // Create new note
      const note: Note = {
        id: Date.now().toString(),
        title: newNote.title || '',
        content: newNote.content || '',
        category: newNote.category as NoteCategory || 'General',
        priority: newNote.priority as NotePriority || 'Medium',
        createdAt: currentTime,
        updatedAt: currentTime,
        isPinned: newNote.isPinned || false
      };
      setNotes(prev => [note, ...prev]);
    }

    setIsModalOpen(false);
    setEditingNote(null);
    setNewNote({
      title: '',
      content: '',
      category: 'General',
      priority: 'Medium',
      isPinned: false
    });
  };

  // Filter notes based on search and category
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter(note => note.isPinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.isPinned);

  return (
    <PageLayout>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="h-full"
      >
        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
            <button
              onClick={handleCreateNote}
              className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-black/90 transition-colors text-sm"
            >
              <PenLine size={16} />
              New Note
            </button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search notes..."
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-black text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Tag size={16} />
                All Notes
              </button>
              {categories.map(({ type, icon, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedCategory(type)}
                  className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                    selectedCategory === type
                      ? 'bg-black text-white'
                      : `${color} hover:opacity-80`
                  }`}
                >
                  {icon}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Grid */}
          <div className="space-y-6">
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">📌 Pinned Notes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={() => handleDeleteNote(note.id)}
                      onTogglePin={handleTogglePin}
                      categories={categories}
                      priorities={priorities}
                      onView={() => setViewNote(note)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h2 className="text-sm font-medium text-gray-500 mb-3">Other Notes</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={() => handleDeleteNote(note.id)}
                      onTogglePin={handleTogglePin}
                      categories={categories}
                      priorities={priorities}
                      onView={() => setViewNote(note)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredNotes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-3">
                  <FileText size={48} className="mx-auto" />
                </div>
                <h3 className="text-gray-500 font-medium mb-1">No notes found</h3>
                <p className="text-gray-400 text-sm">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Create your first note by clicking the "New Note" button'}
                </p>
              </div>
            )}
          </div>

          {/* Note Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingNote ? 'Edit Note' : 'New Note'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[120px] resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Category</label>
                  <select
                    value={newNote.category}
                    onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value as NoteCategory }))}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                  >
                    {categories.map(({ type }) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">Priority</label>
                  <select
                    value={newNote.priority}
                    onChange={(e) => setNewNote(prev => ({ ...prev, priority: e.target.value as NotePriority }))}
                    className="w-full px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                  >
                    {priorities.map(({ level }) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin-note"
                  checked={newNote.isPinned}
                  onChange={(e) => setNewNote(prev => ({ ...prev, isPinned: e.target.checked }))}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="pin-note" className="text-sm text-gray-700">
                  Pin this note
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-black text-white hover:bg-black/90 text-sm"
                >
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            isOpen={isDeleteConfirmOpen}
            onClose={() => { setIsDeleteConfirmOpen(false); setDeleteNoteId(null); }}
            title="Delete Note"
          >
            <div className="space-y-4">
              <p>Are you sure you want to delete this note? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsDeleteConfirmOpen(false); setDeleteNoteId(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
                  onClick={() => {
                    if (deleteNoteId) {
                      setNotes(prev => prev.filter(note => note.id !== deleteNoteId));
                    }
                    setIsDeleteConfirmOpen(false);
                    setDeleteNoteId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>

          {/* View Note Modal */}
          <Modal
            isOpen={!!viewNote}
            onClose={() => setViewNote(null)}
            title={viewNote ? viewNote.title : ''}
            modalClassName="max-w-2xl w-[90vw]"
          >
            {viewNote && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  <span className={`px-2 py-1 rounded-full flex items-center gap-1.5 ${categories.find(c => c.type === viewNote.category)?.color}`}>
                    {categories.find(c => c.type === viewNote.category)?.icon}
                    {viewNote.category}
                  </span>
                  <span className={`px-2 py-1 rounded-full ${priorities.find(p => p.level === viewNote.priority)?.color}`}>
                    {viewNote.priority} Priority
                  </span>
                  <span className="text-gray-400">
                    {format(new Date(viewNote.updatedAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="whitespace-pre-line text-gray-800 text-base max-h-[60vh] overflow-y-auto pr-2" style={{wordBreak: 'break-word'}}>
                  {viewNote.content}
                </div>
              </div>
            )}
          </Modal>
        </div>
      </motion.div>
    </PageLayout>
  );
};

// Note Card Component
const NoteCard: React.FC<{
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: () => void;
  onTogglePin: (id: string) => void;
  categories: { type: NoteCategory; icon: React.ReactNode; color: string }[];
  priorities: { level: NotePriority; color: string }[];
  onView: () => void;
}> = ({ note, onEdit, onDelete, onTogglePin, categories, priorities, onView }) => {
  const category = categories.find(c => c.type === note.category);
  const priority = priorities.find(p => p.level === note.priority);

  return (
    <div
      className="bg-white rounded-[20px] border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={e => {
        // Prevent opening modal when clicking on action buttons
        if ((e.target as HTMLElement).closest('button')) return;
        onView();
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-gray-900 truncate flex-1" title={note.title}>
          {note.title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
            className={`p-1 rounded-full hover:bg-gray-100 ${
              note.isPinned ? 'text-yellow-500' : 'text-gray-400'
            }`}
          >
            <Star size={16} fill={note.isPinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(note); }}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
          >
            <PenLine size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{note.content}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-1 rounded-full flex items-center gap-1.5 ${category?.color}`}>
          {category?.icon}
          {note.category}
        </span>
        <span className={`px-2 py-1 rounded-full ${priority?.color}`}>
          {note.priority} Priority
        </span>
        <span className="text-gray-400">
          {format(new Date(note.updatedAt), 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  );
};

export default NotesPage;

import React, { useState } from 'react';
import { FileText, Send, User, Edit2, Trash2, X, Check } from 'lucide-react';
import Button from './ui/Button';
import { CustomerNote } from '../types/database.types';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

interface CustomerNotesSectionProps {
  customerId: string;
  notes: CustomerNote[];
  onNoteAdded: (note: CustomerNote) => void;
}

const CustomerNotesSection: React.FC<CustomerNotesSectionProps> = ({
  customerId,
  notes,
  onNoteAdded,
}) => {
  const { user } = useApp(); // Get user from AppContext
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Get username from the AppContext user object
  const userName = user?.username || user?.email || 'User';

  // Add a new note
  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .insert([
          {
            customer_id: customerId,
            content: newNote,
            author: userName, // Use the current user's name from AppContext
          },
        ])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        onNoteAdded(data);
        setNewNote('');
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing a note
  const handleEditStart = (note: CustomerNote) => {
    setEditingNoteId(note.id);
    setEditedContent(note.content);
  };

  // Cancel editing
  const handleEditCancel = () => {
    setEditingNoteId(null);
    setEditedContent('');
  };

  // Save edited note
  const handleEditSave = async (noteId: string) => {
    if (!editedContent.trim()) return;

    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .update({ content: editedContent, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Update the note in the parent component
        onNoteAdded(data);
        setEditingNoteId(null);
        setEditedContent('');
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Confirm note deletion
  const handleDeleteConfirm = (noteId: string) => {
    setIsDeleting(noteId);
  };

  // Cancel deletion
  const handleDeleteCancel = () => {
    setIsDeleting(null);
  };

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        throw error;
      }

      // Note was deleted successfully, update parent component
      // We pass back the deleted note ID so the parent component can filter it out
      onNoteAdded({ id: noteId, customer_id: customerId, content: '', author: '', created_at: '' });
      setIsDeleting(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <FileText className="h-5 w-5 mr-2 text-accent" />
        Notes
      </h3>

      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <textarea
              className="w-full bg-background-light border-2 border-background-light rounded-lg p-3 text-text-primary resize-none focus:outline-none focus:border-accent transition-colors"
              placeholder="Add a note about this customer..."
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            ></textarea>
            <div className="absolute bottom-3 right-3">
              <Button
                className={`rounded-full p-2 ${!newNote.trim() ? 'bg-background-light text-text-secondary' : ''}`}
                onClick={handleSubmitNote}
                isLoading={isSubmitting}
                disabled={isSubmitting || !newNote.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="bg-background-light p-4 rounded-xl border border-background-light/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <div className="bg-accent/15 p-2 rounded-full mr-3">
                    <User className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">{note.author}</span>
                    <span className="text-xs text-text-secondary block">
                      {formatTime(note.created_at)}
                    </span>
                  </div>
                </div>
                
                {/* Edit and delete controls */}
                <div className="flex space-x-2">
                  {isDeleting === note.id ? (
                    <div className="flex space-x-2 bg-red-900/20 p-1 rounded">
                      <span className="text-xs text-red-300 mr-1">Delete?</span>
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                      >
                        <Check className="h-3 w-3 text-white" />
                      </button>
                      <button 
                        onClick={handleDeleteCancel}
                        className="p-1 rounded-full bg-background-light hover:bg-background transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteConfirm(note.id)}
                      className="p-1 rounded-full hover:bg-background-light/80 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-text-secondary hover:text-red-400" />
                    </button>
                  )}
                  
                  {editingNoteId !== note.id && (
                    <button
                      onClick={() => handleEditStart(note)}
                      className="p-1 rounded-full hover:bg-background-light/80 transition-colors"
                      title="Edit note"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-text-secondary hover:text-accent" />
                    </button>
                  )}
                </div>
              </div>
              
              {editingNoteId === note.id ? (
                <div className="ml-9">
                  <textarea
                    className="w-full bg-background p-2 rounded-lg border border-accent/30 text-sm mb-2 focus:outline-none focus:border-accent"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={handleEditCancel}
                      className="text-xs px-2 py-1 rounded bg-background-light hover:bg-background-light/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleEditSave(note.id)}
                      className="text-xs px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                      disabled={!editedContent.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ml-9 p-2 bg-background/50 rounded-lg border-l-2 border-accent/30">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-text-secondary bg-background-light/50 rounded-xl border border-dashed border-background-light">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notes yet</p>
            <p className="text-xs mt-1">Add the first note about this customer</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerNotesSection;
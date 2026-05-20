import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Upload, FileText, Star, X, FolderOpen, Calendar, User, Loader2 } from 'lucide-react';

export const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState({ subject: '', course: '', topic: '' });
  const [uploading, setUploading] = useState(false);

  const fetchNotes = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get('/notes/', { params: { q: query } });
      setNotes(res.data);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchNotes(searchQuery);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('subject', uploadTags.subject);
    formData.append('course', uploadTags.course);
    formData.append('topic', uploadTags.topic);

    try {
      await api.post('/notes/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
      setUploadTags({ subject: '', course: '', topic: '' });
      // Clear search
      setSearchQuery('');
      // Close modal
      setShowModal(false);
      // Re-fetch
      await fetchNotes();
    } catch (err) {
      console.error("Upload failed", err);
      alert(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto animate-fade-in pb-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-medium text-theme-dark uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-8 h-8 text-theme-accent" />
            Community Notes
          </h1>
          <p className="text-theme-dark/60 mt-1 text-sm">Discover, study, and share curated academic resources with peers globally.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center px-6 py-2.5 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-full font-bold text-sm transition-all"
        >
          <Upload className="w-4 h-4 mr-2" /> Upload Note
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full max-w-3xl shrink-0">
          <input
            type="text"
            placeholder="Search notes by subject, title, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-28 py-3 rounded-full border-none bg-theme-card focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all shadow-sm placeholder:text-theme-dark/40"
          />
          <Search className="absolute left-4 top-3.5 text-theme-dark/40 w-4 h-4" />
          <button 
            type="submit" 
            className="absolute right-2 top-1.5 bg-theme-dark text-white px-5 py-1.5 rounded-full text-xs font-bold hover:bg-theme-dark/95 transition-all"
          >
            Search
          </button>
        </form>

        {/* Notes Container - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-theme-accent"></div>
            </div>
          ) : notes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {notes.map(note => (
                <Link 
                  key={note.id} 
                  to={`/notes/${note.id}`} 
                  className="bg-theme-card rounded-[32px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:bg-theme-cardHover transition-all duration-300 group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-12 h-12 bg-theme-accent/10 text-theme-accent rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      {note.average_rating > 0 && (
                        <div className="flex items-center space-x-1 bg-theme-yellow/10 text-theme-yellow px-2.5 py-1 rounded-lg text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{note.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-theme-dark mb-2 font-display line-clamp-1">{note.title}</h3>
                    <p className="text-theme-dark/60 text-sm mb-6 line-clamp-2 leading-relaxed">{note.description || "No description provided."}</p>
                  </div>

                  <div className="pt-4 border-t border-theme-dark/5">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {note.subject && (
                        <span className="bg-theme-sidebar text-theme-dark/80 text-xs font-bold px-2.5 py-0.5 rounded-full border border-theme-dark/5 capitalize">
                          {note.subject}
                        </span>
                      )}
                      {note.topic && (
                        <span className="bg-theme-sidebar text-theme-dark/80 text-xs font-bold px-2.5 py-0.5 rounded-full border border-theme-dark/5 capitalize">
                          {note.topic}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-theme-dark/40 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-theme-dark/30" /> {note.uploader_username}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-theme-dark/30" /> {new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-theme-card rounded-[32px] border border-dashed border-theme-dark/10 p-8 shadow-sm">
              <FolderOpen className="w-12 h-12 text-theme-dark/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-theme-dark font-display">No notes found</h3>
              <p className="text-theme-dark/50 mt-1 text-sm">Be the first to upload and share comprehensive lecture guides!</p>
            </div>
          )}
        </div>

      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-theme-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-theme-card rounded-[32px] shadow-xl w-full max-w-lg overflow-hidden border border-theme-dark/5">
            <div className="flex justify-between items-center p-6 border-b border-theme-dark/5">
              <h2 className="text-lg font-bold text-theme-dark font-display uppercase tracking-wide">Upload Resource Guide</h2>
              <button onClick={() => setShowModal(false)} className="text-theme-dark/40 hover:text-theme-dark/60 p-1 rounded-full hover:bg-theme-sidebar transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Resource Title *</label>
                <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all" placeholder="e.g. Operating Systems Cheat Sheet" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Description</label>
                <textarea rows="3" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} className="w-full px-4 py-3 rounded-2xl border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all resize-none" placeholder="Brief details about topics covered..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Subject</label>
                  <input type="text" value={uploadTags.subject} onChange={e => setUploadTags({ ...uploadTags, subject: e.target.value })} className="w-full px-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all" placeholder="e.g. OS" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Topic</label>
                  <input type="text" value={uploadTags.topic} onChange={e => setUploadTags({ ...uploadTags, topic: e.target.value })} className="w-full px-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all" placeholder="e.g. Deadlocks" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Select File *</label>
                <input type="file" required onChange={e => setUploadFile(e.target.files[0])} className="w-full p-3 rounded-2xl border border-dashed border-theme-dark/10 text-theme-dark text-sm bg-theme-sidebar/50 focus:ring-2 focus:ring-theme-accent outline-none" />
                <p className="text-[10px] text-theme-dark/40 font-bold mt-1.5 uppercase pl-2">PDF, DOCX, TXT, PPTX or images (Max 20MB)</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-theme-dark/5">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-theme-dark/60 hover:bg-theme-sidebar rounded-full transition-all font-bold text-xs">Cancel</button>
                <button type="submit" disabled={uploading} className="px-6 py-2 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-full transition-all font-bold text-xs disabled:opacity-50 flex items-center gap-1.5">
                  {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{uploading ? 'Uploading...' : 'Publish Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

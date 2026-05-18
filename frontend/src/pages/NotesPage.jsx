import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Upload, FileText, Star, X, Sparkles, FolderOpen, Calendar, User } from 'lucide-react';

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
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-brand-600" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Community Notes</h1>
          </div>
          <p className="text-slate-500 mt-2 text-sm">Discover, study, and share curated academic resources with peers globally.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center px-6 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 hover:shadow-lg active:scale-95 transition-all shadow-md shadow-brand-100/50"
        >
          <Upload className="w-4 h-4 mr-2" /> Upload Note
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-3xl">
        <input
          type="text"
          placeholder="Search notes by subject, title, or topic..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-24 py-4.5 rounded-2xl border border-slate-200/80 shadow-premium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-base text-slate-800 placeholder-slate-400 transition-all"
        />
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <button 
          type="submit" 
          className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-slate-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 transition-all"
        >
          Search
        </button>
      </form>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <Link 
              key={note.id} 
              to={`/notes/${note.id}`} 
              className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-brand-500/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full shadow-sm"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                {note.average_rating > 0 && (
                  <div className="flex items-center space-x-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{note.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 font-display group-hover:text-brand-600 transition-colors line-clamp-1">{note.title}</h3>
              <p className="text-slate-500 text-sm mb-5 line-clamp-2 flex-1 leading-relaxed">{note.description || "No description provided."}</p>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.subject && (
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200/60 capitalize">
                      {note.subject}
                    </span>
                  )}
                  {note.topic && (
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200/60 capitalize">
                      {note.topic}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> {note.uploader_username}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-sm">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 font-display">No notes found</h3>
          <p className="text-slate-500 mt-1 text-sm">Be the first to upload and share comprehensive lecture guides!</p>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h2 className="text-xl font-bold text-slate-900 font-display">Upload Resource Guide</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-5 bg-white">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Resource Title *</label>
                <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 text-sm font-semibold transition-all bg-white" placeholder="e.g. Operating Systems Cheat Sheet" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description</label>
                <textarea rows="3" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 text-sm font-semibold transition-all bg-white resize-none" placeholder="Brief details about topics covered in this document..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Subject</label>
                  <input type="text" value={uploadTags.subject} onChange={e => setUploadTags({ ...uploadTags, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 text-sm font-semibold transition-all bg-white" placeholder="e.g. OS" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Topic</label>
                  <input type="text" value={uploadTags.topic} onChange={e => setUploadTags({ ...uploadTags, topic: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 text-sm font-semibold transition-all bg-white" placeholder="e.g. Deadlocks" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select File *</label>
                <input type="file" required onChange={e => setUploadFile(e.target.files[0])} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 text-sm bg-slate-50" />
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase">PDF, DOCX, TXT, PPTX or images (Max 20MB)</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold text-xs">Cancel</button>
                <button type="submit" disabled={uploading} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold text-xs disabled:opacity-50 flex items-center gap-1.5">
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

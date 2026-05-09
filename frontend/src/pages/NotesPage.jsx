import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Upload, FileText, Star, X } from 'lucide-react';

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
      setShowModal(false);
      // reset form
      setUploadFile(null); setUploadTitle(''); setUploadDesc('');
      setUploadTags({ subject: '', course: '', topic: '' });
      // refresh notes
      fetchNotes(searchQuery);
    } catch (err) {
      console.error("Upload failed", err);
      alert(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Community Notes</h1>
          <p className="text-slate-500 mt-2">Discover and share study resources with your peers.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Upload className="w-5 h-5 mr-2" /> Upload Note
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-2xl">
        <input 
          type="text" 
          placeholder="Search by title, description, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-brand-500 outline-none text-lg"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
          Search
        </button>
      </form>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <Link key={note.id} to={`/notes/${note.id}`} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all-smooth group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                {note.average_rating > 0 && (
                  <div className="flex items-center space-x-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-sm font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{note.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{note.title}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{note.description || "No description provided."}</p>
              
              <div className="mt-auto">
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.subject && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">{note.subject}</span>}
                  {note.topic && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">{note.topic}</span>}
                </div>
                <div className="flex items-center text-xs text-slate-400 border-t pt-3">
                  <span>By <span className="font-medium text-slate-700">{note.uploader_username}</span></span>
                  <span className="mx-2">•</span>
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No notes found</h3>
          <p className="text-slate-500 mt-1">Be the first to share resources for this topic!</p>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-slate-900">Upload Note</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4 bg-slate-50">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="e.g. OS Final Cheat Sheet" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows="3" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="Brief summary of the notes..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input type="text" value={uploadTags.subject} onChange={e => setUploadTags({...uploadTags, subject: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Operating Systems" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                  <input type="text" value={uploadTags.topic} onChange={e => setUploadTags({...uploadTags, topic: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="e.g. Deadlocks" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                <input type="file" required onChange={e => setUploadFile(e.target.files[0])} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white" />
                <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, PPTX or images (Max 20MB)</p>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={uploading} className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

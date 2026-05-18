import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useCollab } from '../hooks/useCollab';
import { Users, FilePlus, UserPlus, FileText, ArrowLeft, Save, Download, Sparkles, Send, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export const CollabPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newTitle, setNewTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents/');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    try {
      const res = await api.post('/documents/', { title: newTitle });
      setNewTitle('');
      fetchDocuments();
      setActiveDoc(res.data.id);
    } catch (err) {
      alert("Failed to create document");
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !activeDoc) return;
    try {
      await api.post(`/documents/${activeDoc}/invite`, { email: inviteEmail });
      setInviteEmail('');
      alert("Collaborator invited successfully!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to invite");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          <p className="text-slate-500 font-semibold animate-pulse">Initializing Collaborative Sync...</p>
        </div>
      </div>
    );
  }

  // Active Editor View
  if (activeDoc) {
    return (
      <CollabEditor 
        docId={activeDoc} 
        onBack={() => {
          setActiveDoc(null);
          fetchDocuments();
        }} 
        handleInvite={handleInvite}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
      />
    );
  }

  // Document List View
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-brand-600" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Collaboration Space</h1>
          </div>
          <p className="text-slate-500 mt-2 text-sm">Work alongside your peers, edit comprehensive study sheets in real-time, and download your progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-brand-600 animate-pulse" /> Recent Workspace Documents ({documents.length})
          </h2>
          
          {documents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-sm">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 font-display">No collaborative sheets yet</h3>
              <p className="text-slate-500 mt-1 text-sm">Create a new workspace document on the right to start editing live!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDoc(doc.id)}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 hover:border-brand-500/30 hover:shadow-lg hover:-translate-y-0.5 text-left transition-all duration-300 group shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-brand-50 text-brand-600 border border-brand-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      {doc.is_owner ? (
                        <span className="text-[10px] bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-brand-100">Owner</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">Shared</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 truncate text-lg group-hover:text-brand-600 transition-colors font-display">{doc.title}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-4">Updated {new Date(doc.updated_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Document Card */}
        <div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-premium sticky top-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <FilePlus className="w-5 h-5 mr-2 text-brand-600" /> New Collaborative Sheet
            </h2>
            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Database Notes"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900 text-sm font-semibold transition-all bg-white"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full px-5 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 hover:shadow-lg transition-all shadow-md shadow-brand-100"
              >
                Create & Edit Live
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const CollabEditor = ({ docId, onBack, handleInvite, inviteEmail, setInviteEmail }) => {
  const token = localStorage.getItem('token');
  const { content, title, activeUsers, sendEdit } = useCollab(docId, token);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e) => {
    sendEdit(e.target.value);
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    setIsSaved(false);
    try {
      await api.put(`/documents/${docId}`, { content });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      alert("Failed to save document content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'document'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Editor Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 border border-brand-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 font-display leading-tight">{title || 'Connecting Workspace...'}</h1>
              <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider gap-1.5 mt-0.5">
                <span className="flex items-center text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Active Sync
                </span>
                <span>•</span>
                <span>{activeUsers.length} user(s) online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Invite forms */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Active Collaborators Avatars */}
          <div className="flex -space-x-2 mr-2">
            {activeUsers.slice(0, 3).map((uId, i) => (
              <div 
                key={uId} 
                className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br from-brand-400 to-indigo-600 shadow-sm relative z-${30 - i * 10}`} 
                title={uId}
              >
                U{i+1}
              </div>
            ))}
            {activeUsers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black z-0">
                +{activeUsers.length - 3}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className={clsx(
                "flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border",
                isSaved 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-brand-600 hover:bg-brand-700 text-white border-transparent"
              )}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? "Saving..." : isSaved ? "Saved!" : "Save Changes"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Download as Plain Text"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
          
          {/* Invite Input */}
          <form onSubmit={handleInvite} className="flex space-x-2 border-l border-slate-200 pl-4">
            <div className="relative">
              <input 
                type="email" 
                placeholder="Collaborator Email..." 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="text-xs px-3.5 pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-500 w-44 bg-slate-50 focus:bg-white transition-all font-semibold"
              />
              <button 
                type="submit" 
                className="absolute right-1 top-1 p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Send Invite"
              >
                <UserPlus className="w-3 h-3" />
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 p-8 overflow-hidden flex justify-center">
        <div className="w-full max-w-4xl h-full flex flex-col bg-white rounded-3xl shadow-premium border border-slate-200/80 overflow-hidden relative">
          <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Editor Sheet Panel</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-brand-600" /> Collaborative Sandbox</span>
          </div>
          <textarea
            value={content}
            onChange={handleChange}
            className="flex-1 w-full p-8 resize-none outline-none font-mono text-sm text-slate-800 leading-relaxed bg-transparent"
            placeholder="Type notes collaboratively... Changes are broadcasted live to all invited users instantly."
          />
        </div>
      </div>
    </div>
  );
};

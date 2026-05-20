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
      <div className="h-full flex items-center justify-center bg-theme-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent"></div>
          <p className="text-theme-dark/60 font-semibold animate-pulse">Initializing Collaborative Sync...</p>
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
    <div className="h-full flex flex-col max-w-[1400px] mx-auto animate-fade-in pb-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-medium text-theme-dark uppercase tracking-wide flex items-center gap-2">
            <Users className="w-8 h-8 text-theme-accent" />
            Collaboration Space
          </h1>
          <p className="text-theme-dark/60 mt-1 text-sm">Work alongside your peers, edit comprehensive study sheets in real-time, and download your progress.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        <div className="lg:col-span-2 flex flex-col space-y-4 min-h-0">
          <h2 className="text-sm font-bold text-theme-dark/70 flex items-center shrink-0 pl-2">
            <FileText className="w-4 h-4 mr-2 text-theme-accent animate-pulse" /> Recent Workspace Documents ({documents.length})
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {documents.length === 0 ? (
              <div className="text-center py-20 bg-theme-card rounded-[32px] border border-dashed border-theme-dark/10 p-8 shadow-sm">
                <Users className="w-12 h-12 text-theme-dark/20 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-theme-dark font-display">No collaborative sheets yet</h3>
                <p className="text-theme-dark/50 mt-1 text-sm">Create a new workspace document on the right to start editing live!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-6">
                {documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setActiveDoc(doc.id)}
                    className="bg-theme-card p-6 rounded-[32px] shadow-sm flex flex-col justify-between hover:shadow-md hover:bg-theme-cardHover text-left transition-all duration-300 group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-theme-accent/10 text-theme-accent rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        {doc.is_owner ? (
                          <span className="text-[9px] bg-theme-accent/15 text-theme-accent px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Owner</span>
                        ) : (
                          <span className="text-[9px] bg-theme-sidebar text-theme-dark/60 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Shared</span>
                        )}
                      </div>
                      <h3 className="font-bold text-theme-dark truncate text-base font-display">{doc.title}</h3>
                    </div>
                    <p className="text-[10px] text-theme-dark/40 font-bold uppercase tracking-wider mt-6">Updated {new Date(doc.updated_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Document Card */}
        <div className="shrink-0">
          <div className="bg-theme-card p-6 rounded-[32px] shadow-sm space-y-5 border border-theme-dark/5">
            <h2 className="text-base font-bold text-theme-dark flex items-center uppercase tracking-wide">
              <FilePlus className="w-5 h-5 mr-2 text-theme-accent" /> New Collaborative Sheet
            </h2>
            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Database Notes"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full px-5 py-2.5 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-full font-bold text-sm transition-all"
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
    <div className="h-full flex flex-col max-w-[1400px] mx-auto animate-fade-in pb-4">
      {/* Editor Header */}
      <header className="bg-theme-card rounded-[32px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm shrink-0 border border-theme-dark/5 mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-theme-sidebar rounded-full transition-colors text-theme-dark/60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-theme-accent/10 text-theme-accent rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-theme-dark font-display leading-tight">{title || 'Connecting Workspace...'}</h1>
              <div className="flex items-center text-[9px] text-theme-dark/50 font-bold uppercase tracking-wider gap-1.5 mt-0.5">
                <span className="flex items-center text-theme-teal font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-theme-teal mr-1 animate-pulse"></span>
                  Active Sync
                </span>
                <span>•</span>
                <span>{activeUsers.length} online</span>
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
                className={`w-8 h-8 rounded-full border-2 border-theme-card flex items-center justify-center text-[9px] font-black text-white bg-gradient-to-br from-theme-accent to-blue-600 shadow-sm`} 
                title={uId}
              >
                U{i+1}
              </div>
            ))}
            {activeUsers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-theme-card bg-theme-sidebar text-theme-dark/60 flex items-center justify-center text-[9px] font-black">
                +{activeUsers.length - 3}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 border-l border-theme-dark/10 pl-4">
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className={clsx(
                "flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border",
                isSaved 
                  ? "bg-theme-teal/15 text-theme-teal border-theme-teal/20" 
                  : "bg-theme-accent hover:bg-theme-accent/90 text-white border-transparent"
              )}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? "Saving..." : isSaved ? "Saved!" : "Save Changes"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-4 py-2 bg-theme-sidebar hover:bg-theme-sidebar/85 text-theme-dark border border-theme-dark/5 rounded-full text-xs font-bold transition-all shadow-sm"
              title="Download as Plain Text"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
          
          {/* Invite Input */}
          <form onSubmit={handleInvite} className="flex space-x-2 border-l border-theme-dark/10 pl-4">
            <div className="relative">
              <input 
                type="email" 
                placeholder="Invite Email..." 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="text-xs px-3.5 pl-4 pr-10 py-2.5 rounded-full border-none outline-none w-44 bg-theme-sidebar text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
              />
              <button 
                type="submit" 
                className="absolute right-1 top-1 p-1.5 bg-theme-dark text-white rounded-full hover:bg-theme-dark/95 transition-colors"
                title="Send Invite"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 overflow-hidden flex justify-center min-h-0">
        <div className="w-full h-full flex flex-col bg-theme-card rounded-[32px] shadow-sm border border-theme-dark/5 overflow-hidden relative">
          <div className="bg-theme-sidebar/40 px-6 py-3.5 border-b border-theme-dark/5 flex justify-between items-center text-[10px] font-bold text-theme-dark/50 uppercase tracking-widest">
            <span>Editor Sheet Panel</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-theme-accent" /> Collaborative Sandbox</span>
          </div>
          <textarea
            value={content}
            onChange={handleChange}
            className="flex-1 w-full p-8 resize-none outline-none font-mono text-sm text-theme-dark/90 leading-relaxed bg-transparent custom-scrollbar"
            placeholder="Type notes collaboratively... Changes are broadcasted live to all invited users instantly."
          />
        </div>
      </div>
    </div>
  );
};

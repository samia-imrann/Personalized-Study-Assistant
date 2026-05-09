import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useCollab } from '../hooks/useCollab';
import { Users, FilePlus, UserPlus, FileText, ArrowLeft, Save } from 'lucide-react';
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
      alert("Failed to create doc");
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
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Active Editor View
  if (activeDoc) {
    return (
      <CollabEditor 
        docId={activeDoc} 
        onBack={() => setActiveDoc(null)} 
        handleInvite={handleInvite}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
      />
    );
  }

  // Document List View
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Collaboration Space</h1>
        <p className="text-slate-500 mt-2">Work together on notes and study guides in real-time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-brand-500" /> Recent Documents
          </h2>
          
          {documents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No documents yet. Create one to start collaborating!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDoc(doc.id)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md text-left transition-all-smooth group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    {doc.is_owner ? (
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded font-medium">Owner</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">Shared</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 truncate text-lg group-hover:text-brand-600 transition-colors">{doc.title}</h3>
                  <p className="text-xs text-slate-400 mt-2">Updated {new Date(doc.updated_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <FilePlus className="w-5 h-5 mr-2 text-brand-500" /> New Document
            </h2>
            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Document Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-sm"
              >
                Create & Edit
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

  const handleChange = (e) => {
    sendEdit(e.target.value);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Editor Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{title || 'Loading...'}</h1>
              <div className="flex items-center text-xs text-slate-500 space-x-1">
                <span className="flex items-center text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                  Live
                </span>
                <span>•</span>
                <span>{activeUsers.length} active user(s)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex -space-x-2">
            {activeUsers.slice(0, 3).map((uId, i) => (
              <div key={uId} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white z-${30-i*10} bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm`} title={uId}>
                U{i+1}
              </div>
            ))}
            {activeUsers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold z-0">
                +{activeUsers.length - 3}
              </div>
            )}
          </div>
          
          <form onSubmit={handleInvite} className="flex space-x-2 border-l pl-4">
            <input 
              type="email" 
              placeholder="Invite via email..." 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-500 w-48 bg-slate-50 focus:bg-white transition-colors"
            />
            <button type="submit" className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
              <UserPlus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 p-8 overflow-hidden flex justify-center">
        <div className="w-full max-w-4xl h-full flex flex-col glass rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
          <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-200 flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider">
            Document Editor
          </div>
          <textarea
            value={content}
            onChange={handleChange}
            className="flex-1 w-full p-8 resize-none outline-none font-mono text-slate-800 leading-relaxed bg-transparent"
            placeholder="Start typing... Anyone with access can edit this document in real-time."
          />
        </div>
      </div>
    </div>
  );
};

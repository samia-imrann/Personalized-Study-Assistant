import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShieldCheck, 
  BookOpen, 
  Users, 
  FileText, 
  Trash2, 
  Plus, 
  Check, 
  Loader2, 
  Activity, 
  FileUp, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, quizzes: 0, study_materials: 0, notes: 0 });
  const [users, setUsers] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Topic and Subject lists for dropdowns
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Form states
  const [quizForm, setQuizForm] = useState({
    title: '',
    topic_id: '',
    questions: [
      { question_text: '', options: ['', '', '', ''], correct_index: 0, difficulty: 'medium' }
    ]
  });

  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    url: '',
    topic_id: '',
    material_type: 'article'
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, matsRes, quizzesRes, notesRes, subsRes, topicsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/study-materials'),
        api.get('/quizzes/'),
        api.get('/notes/'),
        api.get('/quizzes/subjects'),
        api.get('/quizzes/topics')
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setStudyMaterials(matsRes.data);
      setQuizzes(quizzesRes.data);
      setNotes(notesRes.data);
      setSubjects(subsRes.data);
      setTopics(topicsRes.data);
    } catch (err) {
      console.error('Failed to load admin data', err);
      showMsg('error', 'Failed to synchronize administrative dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // User Management
  const handleToggleAdmin = async (userId) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/users/${userId}/toggle-admin`);
      setUsers(users.map(u => u.id === userId ? res.data : u));
      showMsg('success', 'User administrative credentials updated.');
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to update credentials.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Handlers
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
      setStats(s => ({ ...s, quizzes: s.quizzes - 1 }));
      showMsg('success', 'Quiz removed successfully.');
    } catch (err) {
      showMsg('error', 'Failed to remove quiz.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this study resource?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/study-materials/${materialId}`);
      setStudyMaterials(studyMaterials.filter(m => m.id !== materialId));
      setStats(s => ({ ...s, study_materials: s.study_materials - 1 }));
      showMsg('success', 'Study resource removed successfully.');
    } catch (err) {
      showMsg('error', 'Failed to remove study resource.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this community note?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
      setStats(s => ({ ...s, notes: s.notes - 1 }));
      showMsg('success', 'Community note removed.');
    } catch (err) {
      showMsg('error', 'Failed to remove community note.');
    } finally {
      setActionLoading(false);
    }
  };

  // Creation Submissions
  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.topic_id) return showMsg('error', 'Please choose a topic.');
    setActionLoading(true);
    try {
      const res = await api.post('/admin/study-materials', materialForm);
      setStudyMaterials([res.data, ...studyMaterials]);
      setStats(s => ({ ...s, study_materials: s.study_materials + 1 }));
      setMaterialForm({ title: '', description: '', url: '', topic_id: '', material_type: 'article' });
      showMsg('success', 'New study resource created.');
    } catch (err) {
      showMsg('error', 'Failed to save study resource.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!quizForm.topic_id) return showMsg('error', 'Please choose a topic.');
    if (!quizForm.title) return showMsg('error', 'Quiz must have a title.');
    
    setActionLoading(true);
    try {
      const res = await api.post('/admin/quizzes', quizForm);
      setQuizzes([res.data, ...quizzes]);
      setStats(s => ({ ...s, quizzes: s.quizzes + 1 }));
      setQuizForm({
        title: '',
        topic_id: '',
        questions: [{ question_text: '', options: ['', '', '', ''], correct_index: 0, difficulty: 'medium' }]
      });
      showMsg('success', 'New interactive quiz created successfully!');
    } catch (err) {
      showMsg('error', 'Failed to create quiz. Verify question formats.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quiz Form Helpers
  const addQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        { question_text: '', options: ['', '', '', ''], correct_index: 0, difficulty: 'medium' }
      ]
    });
  };

  const removeQuestion = (index) => {
    if (quizForm.questions.length === 1) return;
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.filter((_, i) => i !== index)
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...quizForm.questions];
    updated[index][field] = value;
    setQuizForm({ ...quizForm, questions: updated });
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...quizForm.questions];
    updated[qIndex].options[oIndex] = value;
    setQuizForm({ ...quizForm, questions: updated });
  };

  const filteredTopics = selectedSubject
    ? topics.filter(t => t.subject_id === parseInt(selectedSubject))
    : topics;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-bg text-theme-dark">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
          <p className="text-theme-dark/60 font-semibold animate-pulse">Initializing Administrative Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto animate-fade-in pb-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 shrink-0">
        <div>
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-theme-accent" />
            <h1 className="text-3xl font-display font-medium text-theme-dark uppercase tracking-wide">
              Admin Portal
            </h1>
          </div>
          <p className="text-theme-dark/60 mt-1 text-sm">Platform administration, user controls, and resource moderation.</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-theme-sidebar p-1.5 rounded-full mt-4 md:mt-0 shadow-sm border border-theme-dark/5">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'quizzes', name: 'Quizzes' },
            { id: 'materials', name: 'Materials' },
            { id: 'users', name: 'Users' },
            { id: 'notes', name: 'Notes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full font-bold text-xs transition-all ${
                activeTab === tab.id 
                  ? 'bg-theme-accent text-white shadow-sm' 
                  : 'text-theme-dark/60 hover:text-theme-dark hover:bg-theme-card/50'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messaging Alert banner */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center space-x-3 border shrink-0 ${
          message.type === 'success' 
            ? 'bg-theme-teal/15 border-theme-teal/20 text-theme-teal' 
            : 'bg-theme-pink/15 border-theme-pink/20 text-theme-pink'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wide">{message.text}</span>
        </div>
      )}

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        
        {/* tab: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 pb-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', count: stats.users, icon: Users, bg: 'bg-theme-accent/15 text-theme-accent border-theme-accent/20' },
                { label: 'Interactive Quizzes', count: stats.quizzes, icon: BookOpen, bg: 'bg-theme-yellow/15 text-theme-yellow border-theme-yellow/20' },
                { label: 'Study Resources', count: stats.study_materials, icon: FileCheck, bg: 'bg-theme-teal/15 text-theme-teal border-theme-teal/20' },
                { label: 'Community Notes', count: stats.notes, icon: FileText, bg: 'bg-theme-pink/15 text-theme-pink border-theme-pink/20' }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={i}
                    className="bg-theme-card border border-theme-dark/5 p-6 rounded-[32px] flex items-center space-x-5 shadow-sm"
                  >
                    <div className={`p-4 rounded-2xl border ${card.bg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-theme-dark/40 text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
                      <p className="text-2xl font-black text-theme-dark mt-1 leading-none">{card.count}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Stats Panel */}
            <div className="bg-theme-card border border-theme-dark/5 p-8 rounded-[32px] shadow-sm">
              <h2 className="text-base font-bold flex items-center space-x-2 text-theme-dark uppercase tracking-wide">
                <Activity className="w-5 h-5 text-theme-accent" />
                <span>Platform Health Log</span>
              </h2>
              <div className="mt-6 space-y-3 text-sm text-theme-dark/80">
                <div className="flex justify-between py-3 border-b border-theme-dark/5">
                  <span className="font-semibold text-theme-dark/70">Database Sync Status</span>
                  <span className="text-theme-teal font-bold flex items-center"><Check className="w-4 h-4 mr-1"/> Active & Synchronized</span>
                </div>
                <div className="flex justify-between py-3 border-b border-theme-dark/5">
                  <span className="font-semibold text-theme-dark/70">AI Recommendation Engine</span>
                  <span className="text-theme-dark font-bold">Active (Cosine Similarity Model)</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="font-semibold text-theme-dark/70">Primary Super Admin</span>
                  <span className="text-theme-accent font-bold">admin@adaptiq.com</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* tab: QUIZZES */}
        {activeTab === 'quizzes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
            {/* List existing quizzes */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-theme-dark/80 pl-2">Existing Quizzes ({quizzes.length})</h2>
              <div className="bg-theme-card border border-theme-dark/5 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-theme-sidebar/40 border-b border-theme-dark/5 text-theme-dark/50 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-4 pl-6">Quiz Title</th>
                        <th className="p-4">Topic ID</th>
                        <th className="p-4">Created At</th>
                        <th className="p-4 pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-dark/5 text-theme-dark/80">
                      {quizzes.map((q) => (
                        <tr key={q.id} className="hover:bg-theme-cardHover transition-all text-xs">
                          <td className="p-4 pl-6 font-bold text-theme-dark">{q.title}</td>
                          <td className="p-4 text-theme-dark/70 font-semibold">Topic #{q.topic_id}</td>
                          <td className="p-4 text-theme-dark/50">{new Date(q.created_at).toLocaleDateString()}</td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDeleteQuiz(q.id)}
                              className="text-theme-pink hover:bg-theme-pink/15 p-2 rounded-full transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {quizzes.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-theme-dark/40 font-semibold">No quizzes available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Create Quiz Form */}
            <div className="bg-theme-card border border-theme-dark/5 p-6 rounded-[32px] shadow-sm h-fit">
              <h2 className="text-base font-bold flex items-center space-x-2 mb-6 text-theme-dark uppercase tracking-wide">
                <Plus className="w-5 h-5 text-theme-accent" />
                <span>Create New Quiz</span>
              </h2>
              <form onSubmit={handleCreateQuiz} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Quiz Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Database Optimization"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full bg-theme-sidebar border-none rounded-full px-4 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Subject</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => { setSelectedSubject(e.target.value); setQuizForm({ ...quizForm, topic_id: '' }); }}
                      className="w-full bg-theme-sidebar border-none rounded-full px-3 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                    >
                      <option value="">Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Topic</label>
                    <select
                      required
                      value={quizForm.topic_id}
                      onChange={(e) => setQuizForm({ ...quizForm, topic_id: parseInt(e.target.value) })}
                      className="w-full bg-theme-sidebar border-none rounded-full px-3 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                    >
                      <option value="">Topic</option>
                      {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Questions Builder */}
                <div className="space-y-4 pt-4 border-t border-theme-dark/5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-theme-dark/50">Questions ({quizForm.questions.length})</label>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="flex items-center text-xs text-theme-accent font-bold hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> <span>Add</span>
                    </button>
                  </div>

                  {quizForm.questions.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 bg-theme-sidebar/40 border border-theme-dark/5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-theme-dark/50">Question #{qIndex + 1}</span>
                        {quizForm.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-[10px] text-theme-pink font-bold hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Question Prompt"
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                          className="w-full bg-theme-sidebar border-none rounded-xl px-3 py-2 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIndex) => (
                          <input
                            key={oIndex}
                            type="text"
                            required
                            placeholder={`Option ${oIndex + 1}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            className="w-full bg-theme-sidebar border-none rounded-xl px-3 py-2 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-theme-dark/50 pl-1">Correct</label>
                          <select
                            value={q.correct_index}
                            onChange={(e) => handleQuestionChange(qIndex, 'correct_index', parseInt(e.target.value))}
                            className="w-full bg-theme-sidebar border-none rounded-full px-2 py-1.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                          >
                            {q.options.map((_, idx) => (
                              <option key={idx} value={idx}>Opt {idx + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-theme-dark/50 pl-1">Difficulty</label>
                          <select
                            value={q.difficulty}
                            onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                            className="w-full bg-theme-sidebar border-none rounded-full px-2 py-1.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-theme-accent hover:bg-theme-accent/90 disabled:bg-theme-sidebar/55 text-white font-bold py-2.5 rounded-full transition-all flex items-center justify-center space-x-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Publish Interactive Quiz</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* tab: MATERIALS */}
        {activeTab === 'materials' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
            {/* List study resources */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-theme-dark/80 pl-2">Platform Study Resources ({studyMaterials.length})</h2>
              <div className="bg-theme-card border border-theme-dark/5 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-theme-sidebar/40 border-b border-theme-dark/5 text-theme-dark/50 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-4 pl-6">Resource Details</th>
                        <th className="p-4">Topic</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-dark/5 text-theme-dark/80">
                      {studyMaterials.map((m) => (
                        <tr key={m.id} className="hover:bg-theme-cardHover transition-all text-xs">
                          <td className="p-4 pl-6">
                            <p className="font-bold text-theme-dark">{m.title}</p>
                            <p className="text-[10px] text-theme-dark/50 truncate w-64">{m.description || 'No description'}</p>
                            <a 
                              href={m.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] text-theme-accent hover:underline inline-block mt-0.5 truncate w-64 font-bold"
                            >
                              {m.url}
                            </a>
                          </td>
                          <td className="p-4 text-theme-dark/70 font-semibold">{m.topic_name || `Topic #${m.topic_id}`}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-theme-sidebar text-theme-dark border border-theme-dark/5 capitalize">
                              {m.material_type}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="text-theme-pink hover:bg-theme-pink/15 p-2 rounded-full transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {studyMaterials.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-theme-dark/40 font-semibold">No study resources uploaded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Upload Resource Form */}
            <div className="bg-theme-card border border-theme-dark/5 p-6 rounded-[32px] shadow-sm h-fit">
              <h2 className="text-base font-bold flex items-center space-x-2 mb-6 text-theme-dark uppercase tracking-wide">
                <FileUp className="w-5 h-5 text-theme-accent" />
                <span>Upload Study Resource</span>
              </h2>
              <form onSubmit={handleCreateMaterial} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Resource Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPU Register Maps"
                    value={materialForm.title}
                    onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                    className="w-full bg-theme-sidebar border-none rounded-full px-4 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Brief Description</label>
                  <textarea
                    placeholder="Summarize the resource content..."
                    value={materialForm.description}
                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                    className="w-full bg-theme-sidebar border-none rounded-2xl px-4 py-3 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">External URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/lecture.pdf"
                    value={materialForm.url}
                    onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                    className="w-full bg-theme-sidebar border-none rounded-full px-4 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Subject</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => { setSelectedSubject(e.target.value); setMaterialForm({ ...materialForm, topic_id: '' }); }}
                      className="w-full bg-theme-sidebar border-none rounded-full px-3 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                    >
                      <option value="">Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Topic</label>
                    <select
                      required
                      value={materialForm.topic_id}
                      onChange={(e) => setMaterialForm({ ...materialForm, topic_id: parseInt(e.target.value) })}
                      className="w-full bg-theme-sidebar border-none rounded-full px-3 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                    >
                      <option value="">Topic</option>
                      {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Resource Format</label>
                  <select
                    value={materialForm.material_type}
                    onChange={(e) => setMaterialForm({ ...materialForm, material_type: e.target.value })}
                    className="w-full bg-theme-sidebar border-none rounded-full px-3 py-2.5 text-xs text-theme-dark font-semibold focus:ring-2 focus:ring-theme-accent"
                  >
                    <option value="article">Article / Webpage</option>
                    <option value="pdf">PDF Lecture Document</option>
                    <option value="video">Video Tutorial</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-theme-accent hover:bg-theme-accent/90 disabled:bg-theme-sidebar/55 text-white font-bold py-2.5 rounded-full transition-all flex items-center justify-center space-x-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Publish Study Resource</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* tab: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4 pb-6">
            <h2 className="text-base font-bold text-theme-dark/80 pl-2">Platform User Directory ({users.length})</h2>
            <div className="bg-theme-card border border-theme-dark/5 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-theme-sidebar/40 border-b border-theme-dark/5 text-theme-dark/50 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Username</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4">Administrative Role</th>
                      <th className="p-4 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-dark/5 text-theme-dark/80">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-theme-cardHover transition-all text-xs">
                        <td className="p-4 pl-6 font-bold text-theme-dark">{u.username}</td>
                        <td className="p-4 text-theme-dark/70 font-semibold">{u.email}</td>
                        <td className="p-4 text-theme-dark/50">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                            u.is_admin 
                              ? 'bg-theme-teal/15 text-theme-teal border-theme-teal/20' 
                              : 'bg-theme-sidebar text-theme-dark/70 border-theme-dark/5'
                          }`}>
                            {u.is_admin ? 'Admin' : 'Student'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            disabled={actionLoading || u.email === 'admin@adaptiq.com'}
                            onClick={() => handleToggleAdmin(u.id)}
                            className={`text-[10px] font-bold px-4 py-1.5 rounded-full border transition-all ${
                              u.email === 'admin@adaptiq.com'
                                ? 'bg-theme-sidebar text-theme-dark/30 border-theme-dark/5 cursor-not-allowed'
                                : u.is_admin 
                                  ? 'bg-theme-pink/15 text-theme-pink border-theme-pink/20 hover:bg-theme-pink/20' 
                                  : 'bg-theme-teal/15 text-theme-teal border-theme-teal/20 hover:bg-theme-teal/20'
                            }`}
                          >
                            {u.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* tab: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4 pb-6">
            <h2 className="text-base font-bold text-theme-dark/80 pl-2">Moderated Community Notes ({notes.length})</h2>
            <div className="bg-theme-card border border-theme-dark/5 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-theme-sidebar/40 border-b border-theme-dark/5 text-theme-dark/50 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Note Details</th>
                      <th className="p-4">Uploader</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Uploaded At</th>
                      <th className="p-4 pr-6 text-right">Moderation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-dark/5 text-theme-dark/80">
                    {notes.map((n) => (
                      <tr key={n.id} className="hover:bg-theme-cardHover transition-all text-xs">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-theme-dark">{n.title}</p>
                          <p className="text-[10px] text-theme-dark/50 truncate w-64">{n.description || 'No description'}</p>
                        </td>
                        <td className="p-4 text-theme-dark/70 font-semibold">
                          <p className="font-bold">{n.uploader_username}</p>
                          <p className="text-[9px] text-theme-dark/40 font-mono font-medium">{n.uploader_id}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-theme-sidebar text-theme-dark border border-theme-dark/5 capitalize">
                            {n.subject}
                          </span>
                        </td>
                        <td className="p-4 text-theme-dark/50">{new Date(n.created_at).toLocaleDateString()}</td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-theme-pink hover:bg-theme-pink/15 p-2 rounded-full transition-all"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {notes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-theme-dark/40 font-semibold">No community notes found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

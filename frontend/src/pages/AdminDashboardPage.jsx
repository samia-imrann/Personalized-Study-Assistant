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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
          <p className="text-slate-500 font-semibold animate-pulse">Initializing Security Protocols...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-brand-600" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Admin Portal
            </h1>
          </div>
          <p className="text-slate-500 mt-1">Platform administration, user controls, and resource moderation.</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mt-4 md:mt-0 shadow-sm">
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
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messaging Alert banner */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm">{message.text}</span>
        </div>
      )}

      {/* tab: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Users', count: stats.users, icon: Users, bg: 'bg-blue-50 text-blue-600 border-blue-100' },
              { label: 'Interactive Quizzes', count: stats.quizzes, icon: BookOpen, bg: 'bg-purple-50 text-purple-600 border-purple-100' },
              { label: 'Study Materials', count: stats.study_materials, icon: FileCheck, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
              { label: 'Community Notes', count: stats.notes, icon: FileText, bg: 'bg-rose-50 text-rose-600 border-rose-100' }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div 
                  key={i}
                  className="bg-white border border-slate-200/80 p-6 rounded-2xl flex items-center space-x-5 hover:shadow-md transition-all shadow-sm"
                >
                  <div className={`p-4 rounded-xl border ${card.bg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{card.label}</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{card.count}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold flex items-center space-x-2 text-slate-900">
              <Activity className="w-5 h-5 text-brand-600" />
              <span>Platform Health Log</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Database Sync Status</span>
                <span className="text-emerald-600 font-bold flex items-center"><Check className="w-4 h-4 mr-1"/> Active & Synchronized</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-700">AI Recommendation Engine</span>
                <span className="text-slate-800 font-bold">Active (Cosine Similarity Model)</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="font-semibold text-slate-700">Primary Super Admin</span>
                <span className="text-brand-600 font-bold">admin@adaptiq.com</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* tab: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List existing quizzes */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Existing Quizzes ({quizzes.length})</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Quiz Title</th>
                    <th className="p-4">Topic ID</th>
                    <th className="p-4">Created At</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {quizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-all text-sm">
                      <td className="p-4 font-bold text-slate-900">{q.title}</td>
                      <td className="p-4 text-slate-600 font-medium">Topic #{q.topic_id}</td>
                      <td className="p-4 text-slate-500">{new Date(q.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleDeleteQuiz(q.id)}
                          className="text-rose-600 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quizzes.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400">No quizzes available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Quiz Form */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-xl font-bold flex items-center space-x-2 mb-6 text-slate-900">
              <Plus className="w-5 h-5 text-brand-600" />
              <span>Create New Quiz</span>
            </h2>
            <form onSubmit={handleCreateQuiz} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Quiz Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Database Optimization"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setQuizForm({ ...quizForm, topic_id: '' }); }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Choose Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Topic</label>
                  <select
                    required
                    value={quizForm.topic_id}
                    onChange={(e) => setQuizForm({ ...quizForm, topic_id: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Choose Topic</option>
                    {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Questions ({quizForm.questions.length})</label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center space-x-1 text-xs text-brand-600 hover:text-brand-700 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>Add Question</span>
                  </button>
                </div>

                {quizForm.questions.map((q, qIndex) => (
                  <div key={qIndex} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Question #{qIndex + 1}</span>
                      {quizForm.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold"
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
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
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
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Correct Option</label>
                        <select
                          value={q.correct_index}
                          onChange={(e) => handleQuestionChange(qIndex, 'correct_index', parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none animate-none"
                        >
                          {q.options.map((_, idx) => (
                            <option key={idx} value={idx}>Option {idx + 1}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Difficulty</label>
                        <select
                          value={q.difficulty}
                          onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
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
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-brand-100"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List study resources */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Platform Study Resources ({studyMaterials.length})</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Resource Details</th>
                    <th className="p-4">Topic</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {studyMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-all text-sm">
                      <td className="p-4">
                        <p className="font-bold text-slate-900">{m.title}</p>
                        <p className="text-xs text-slate-500 truncate w-64">{m.description || 'No description'}</p>
                        <a 
                          href={m.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-brand-600 hover:underline inline-block mt-0.5 truncate w-64 font-medium"
                        >
                          {m.url}
                        </a>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{m.topic_name || `Topic #${m.topic_id}`}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {m.material_type}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="text-rose-600 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {studyMaterials.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400">No study resources uploaded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload Resource Form */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-xl font-bold flex items-center space-x-2 mb-6 text-slate-900">
              <FileUp className="w-5 h-5 text-brand-600" />
              <span>Upload Study Resource</span>
            </h2>
            <form onSubmit={handleCreateMaterial} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Resource Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to CPU Register Maps"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Brief Description</label>
                <textarea
                  placeholder="Summarize the resource content..."
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">External URL / Document Path</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/lecture_note.pdf"
                  value={materialForm.url}
                  onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setMaterialForm({ ...materialForm, topic_id: '' }); }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Choose Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Topic</label>
                  <select
                    required
                    value={materialForm.topic_id}
                    onChange={(e) => setMaterialForm({ ...materialForm, topic_id: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Choose Topic</option>
                    {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Resource Format</label>
                <select
                  value={materialForm.material_type}
                  onChange={(e) => setMaterialForm({ ...materialForm, material_type: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="article">Article / Webpage</option>
                  <option value="pdf">PDF Lecture Document</option>
                  <option value="video">Video Tutorial</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-brand-100"
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
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Platform User Directory ({users.length})</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Username</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4">Administrative Role</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-all text-sm">
                    <td className="p-4 font-bold text-slate-900">{u.username}</td>
                    <td className="p-4 text-slate-600 font-semibold">{u.email}</td>
                    <td className="p-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                        u.is_admin 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {u.is_admin ? 'Admin' : 'Student'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        disabled={actionLoading || u.email === 'admin@adaptiq.com'}
                        onClick={() => handleToggleAdmin(u.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          u.email === 'admin@adaptiq.com'
                            ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                            : u.is_admin 
                              ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100/50' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/50'
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
      )}

      {/* tab: NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Moderated Community Notes ({notes.length})</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Note Details</th>
                  <th className="p-4">Uploader</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Uploaded At</th>
                  <th className="p-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {notes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-all text-sm">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 truncate w-64">{n.description || 'No description'}</p>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      <p className="font-bold">{n.uploader_username}</p>
                      <p className="text-[10px] text-slate-400 font-mono font-medium">{n.uploader_id}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                        {n.subject}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{new Date(n.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-rose-600 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all"
                        title="Delete note (moderation)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {notes.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">No community notes found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

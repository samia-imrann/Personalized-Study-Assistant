import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, BookOpen, Clock, ChevronRight, Sparkles } from 'lucide-react';

export const QuizzesPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [subRes, topRes] = await Promise.all([
          api.get('/quizzes/subjects'),
          api.get('/quizzes/topics')
        ]);
        setSubjects(subRes.data);
        setTopics(topRes.data);
      } catch (err) {
        console.error("Failed to fetch filters", err);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedSubject) params.subject_id = selectedSubject;
        if (selectedTopic) params.topic_id = selectedTopic;
        
        const res = await api.get('/quizzes/', { params });
        setQuizzes(res.data);
      } catch (err) {
        console.error("Failed to fetch quizzes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [selectedSubject, selectedTopic]);

  const filteredTopics = selectedSubject 
    ? topics.filter(t => t.subject_id.toString() === selectedSubject)
    : topics;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-brand-600" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Interactive Quizzes</h1>
          </div>
          <p className="text-slate-500 mt-2 text-sm">Test your comprehension, challenge weak areas, and log practice accuracy metrics.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200/80 flex flex-col md:flex-row gap-5">
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Subject Category</label>
          <div className="relative">
            <Filter className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic('');
              }}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none appearance-none bg-white text-slate-800 text-sm font-semibold transition-all"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Specific Topic</label>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!selectedSubject && topics.length === 0}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none appearance-none bg-white disabled:bg-slate-50 disabled:text-slate-400 text-slate-800 text-sm font-semibold transition-all"
            >
              <option value="">All Topics</option>
              {filteredTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quiz Cards Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-brand-500/30 transition-all duration-300 group flex flex-col shadow-sm">
              <div className="p-6 flex-1">
                <div className="w-12 h-12 bg-brand-50 text-brand-600 border border-brand-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 font-display group-hover:text-brand-600 transition-colors line-clamp-1">{quiz.title}</h3>
                
                <div className="flex items-center text-xs font-bold text-slate-500 gap-3">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Untimed</span>
                  <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                    {topics.find(t => t.id === quiz.topic_id)?.name || 'General'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 group-hover:bg-brand-50/50 transition-colors">
                <Link 
                  to={`/quizzes/${quiz.id}/attempt`}
                  className="w-full flex items-center justify-center font-bold text-sm text-brand-600 group-hover:text-brand-700"
                >
                  Start Quiz <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No quizzes available</h3>
          <p className="text-slate-500 mt-1 text-sm">Modify filter parameters to check for newly published content.</p>
        </div>
      )}
    </div>
  );
};

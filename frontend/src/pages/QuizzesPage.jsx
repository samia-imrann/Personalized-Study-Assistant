import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, BookOpen, Clock, ChevronRight } from 'lucide-react';

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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Quizzes</h1>
        <p className="text-slate-500 mt-2">Test your knowledge across different subjects and topics.</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Subject</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic('');
              }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none appearance-none bg-white"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Topic</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!selectedSubject && topics.length === 0}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none appearance-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">All Topics</option>
              {filteredTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-brand-300 transition-all-smooth group flex flex-col">
              <div className="p-6 flex-1">
                <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{quiz.title}</h3>
                <div className="flex items-center text-sm text-slate-500 space-x-4">
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Untimed</span>
                  <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">
                    {topics.find(t => t.id === quiz.topic_id)?.name || 'Topic'}
                  </span>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 group-hover:bg-brand-50 transition-colors">
                <Link 
                  to={`/quizzes/${quiz.id}/attempt`}
                  className="w-full flex items-center justify-center font-semibold text-brand-600 group-hover:text-brand-700"
                >
                  Start Quiz <ChevronRight className="w-5 h-5 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No quizzes found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters to find more quizzes.</p>
        </div>
      )}
    </div>
  );
};

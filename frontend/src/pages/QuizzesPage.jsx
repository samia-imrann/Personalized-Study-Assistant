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
    <div className="h-full flex flex-col max-w-[1400px] mx-auto animate-fade-in pb-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-medium text-theme-dark uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-theme-accent" />
            Interactive Quizzes
          </h1>
          <p className="text-theme-dark/60 mt-1 text-sm">Test your comprehension, challenge weak areas, and log practice accuracy metrics.</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        
        {/* Filters Bar */}
        <div className="bg-theme-card p-6 rounded-[32px] shadow-sm flex flex-col md:flex-row gap-5 shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Subject Category</label>
            <div className="relative">
              <Filter className="absolute left-4 top-3 text-theme-dark/40 w-4 h-4" />
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTopic('');
                }}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all appearance-none"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Specific Topic</label>
            <div className="relative">
              <Search className="absolute left-4 top-3 text-theme-dark/40 w-4 h-4" />
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={!selectedSubject && topics.length === 0}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent disabled:bg-theme-sidebar/50 disabled:text-theme-dark/30 text-theme-dark text-sm font-semibold transition-all appearance-none"
              >
                <option value="">All Topics</option>
                {filteredTopics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quiz Cards Container - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-theme-accent"></div>
            </div>
          ) : quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="bg-theme-card rounded-[32px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:bg-theme-cardHover transition-all duration-300 group">
                  <div>
                    <div className="w-12 h-12 bg-theme-accent/10 text-theme-accent rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-sm">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-theme-dark mb-2 font-display line-clamp-1">{quiz.title}</h3>
                    
                    <div className="flex items-center text-xs font-semibold text-theme-dark/50 gap-2 mb-6">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-theme-dark/40" /> Untimed</span>
                      <span className="bg-theme-sidebar px-2.5 py-0.5 rounded-full text-theme-dark/70 border border-theme-dark/5">
                        {topics.find(t => t.id === quiz.topic_id)?.name || 'General'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-theme-dark/5">
                    <Link 
                      to={`/quizzes/${quiz.id}/attempt`}
                      className="w-full flex items-center justify-center py-2 bg-theme-accent hover:bg-theme-accent/90 text-white font-bold text-sm rounded-full transition-colors"
                    >
                      Start Quiz <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-theme-card rounded-[32px] border border-dashed border-theme-dark/10 p-8 shadow-sm">
              <BookOpen className="w-12 h-12 text-theme-dark/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-theme-dark">No quizzes available</h3>
              <p className="text-theme-dark/50 mt-1 text-sm">Modify filter parameters to check for newly published content.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

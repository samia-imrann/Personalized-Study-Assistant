import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import api from '../services/api';
import { Target, TrendingUp, BookOpen, AlertCircle, PlayCircle, ChevronRight, Search, MessageCircle, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [progress, setProgress] = useState([]);
  const [recommendations, setRecommendations] = useState({ weak_topics: [], study_materials: [], recommended_quizzes: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quizzes');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, progRes, recRes] = await Promise.all([
          api.get('/performance/summary'),
          api.get('/performance/progress'),
          api.get('/performance/recommendations')
        ]);
        setSummary(sumRes.data);
        setProgress(progRes.data);
        setRecommendations(recRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent"></div>
        </div>
      </div>
    );
  }

  const overallAvg = summary.length
    ? summary.reduce((acc, curr) => acc + curr.avg_score, 0) / summary.length
    : 0;

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto animate-fade-in pb-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-medium text-theme-dark uppercase tracking-wide">
          HELLO, {user?.username || 'STUDENT'}!
        </h1>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

        {/* Left/Center Content (3 columns wide) */}
        <div className="lg:col-span-3 flex flex-col space-y-6 min-h-0 overflow-y-auto pr-2 custom-scrollbar">

          {/* Top Row: Focus Areas & Upcoming */}
          <div className="grid grid-cols-2 gap-6 shrink-0">
            {/* Focus Areas (like Linked Teachers) */}
            <div className="bg-theme-card rounded-[32px] p-6 shadow-sm">
              <h2 className="text-theme-dark/70 text-sm font-semibold mb-4 pl-2">Focus Areas</h2>
              <div className="space-y-3">
                {recommendations.weak_topics.slice(0, 3).map((topic, i) => (
                  <div key={i} className="flex items-center justify-between bg-theme-bg/60 p-3 rounded-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-theme-sidebar flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-theme-pink" />
                      </div>
                      <span className="font-semibold text-sm text-theme-dark">{topic.topic_name}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-theme-dark text-white flex items-center justify-center cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                  </div>
                ))}
                {recommendations.weak_topics.length === 0 && (
                  <div className="text-center p-4 text-theme-dark/60 text-sm">No weak areas!</div>
                )}
                <div className="text-right pt-2">
                  <span className="text-xs text-theme-dark/70 font-semibold cursor-pointer hover:text-theme-dark">See more &gt;</span>
                </div>
              </div>
            </div>

            {/* Recent Activity / Next Up (like Upcoming events) */}
            <div className="bg-theme-card rounded-[32px] p-6 shadow-sm flex flex-col">
              <h2 className="text-theme-dark/70 text-sm font-semibold mb-4 pl-2">Activity Overview</h2>
              <div className="space-y-3 flex-1">
                <div className="flex items-start space-x-4 bg-theme-bg/60 p-4 rounded-3xl">
                  <div className="w-12 h-12 rounded-2xl bg-theme-teal/20 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-theme-teal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-theme-dark text-sm">Quizzes Completed</h3>
                    <p className="text-xs text-theme-dark/60 mt-1">{summary.length} total topics explored</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 bg-theme-bg/60 p-4 rounded-3xl">
                  <div className="w-12 h-12 rounded-2xl bg-theme-accent/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-theme-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-theme-dark text-sm">Learning Path</h3>
                    <p className="text-xs text-theme-dark/60 mt-1">Ready for next recommendation</p>
                  </div>
                </div>
              </div>
              <div className="text-right pt-2">
                <span className="text-xs text-theme-dark/70 font-semibold cursor-pointer hover:text-theme-dark">See more &gt;</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Chart (like My Schedule) */}
          <div className="bg-theme-card rounded-[32px] p-6 shadow-sm shrink-0 flex gap-6">
            <div className="w-64 bg-theme-bg/60 rounded-[24px] p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4 text-theme-dark font-semibold">
                <span className="cursor-pointer">&lt;</span>
                <span>Performance</span>
                <span className="cursor-pointer">&gt;</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-12 h-12 text-theme-accent mb-2" />
                <p className="text-sm font-medium text-theme-dark/70">Your recent scores mapped over time.</p>
              </div>
            </div>

            <div className="flex-1 h-48">
              {progress.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.05} />
                    <XAxis dataKey="attempt_date" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 10 }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="daily_pct" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProg)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-theme-dark/50 text-sm">No data yet</div>
              )}
            </div>
          </div>

          {/* Bottom Row: Tabbed Recommendations (like My Projects) */}
          <div className="bg-theme-card rounded-[32px] p-6 shadow-sm shrink-0 flex flex-col h-64">
            <div className="flex space-x-6 border-b border-theme-dark/10 mb-4 pb-2">
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`font-semibold pb-2 relative transition-colors ${activeTab === 'quizzes' ? 'text-theme-dark' : 'text-theme-dark/50'}`}
              >
                Recommended Quizzes
                {activeTab === 'quizzes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-theme-accent rounded-full"></div>}
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`font-semibold pb-2 relative transition-colors ${activeTab === 'materials' ? 'text-theme-dark' : 'text-theme-dark/50'}`}
              >
                Study Materials
                {activeTab === 'materials' && <div className="absolute bottom-0 left-0 w-full h-1 bg-theme-accent rounded-full"></div>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {activeTab === 'quizzes' && (
                <div className="grid grid-cols-2 gap-4">
                  {recommendations.recommended_quizzes.length > 0 ? (
                    recommendations.recommended_quizzes.map(quiz => (
                      <Link key={quiz.quiz_id} to={`/quizzes/${quiz.quiz_id}/attempt`} className="bg-theme-bg/60 rounded-2xl p-4 flex flex-col hover:bg-theme-bg transition-colors">
                        <h4 className="font-bold text-theme-dark text-sm truncate">{quiz.title}</h4>
                        <span className="text-xs text-theme-accent font-semibold mt-1">{quiz.topic_name}</span>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-2 text-sm text-theme-dark/50 p-4">No recommendations available.</div>
                  )}
                </div>
              )}
              {activeTab === 'materials' && (
                <div className="grid grid-cols-2 gap-4">
                  {recommendations.study_materials.length > 0 ? (
                    recommendations.study_materials.map(mat => (
                      <a key={mat.id} href={mat.url} target="_blank" rel="noreferrer" className="bg-theme-bg/60 rounded-2xl p-4 flex flex-col hover:bg-theme-bg transition-colors">
                        <h4 className="font-bold text-theme-dark text-sm truncate">{mat.title}</h4>
                        <span className="text-xs text-theme-dark/60 mt-1 truncate">{mat.description || 'View Resource'}</span>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 text-sm text-theme-dark/50 p-4">No materials available.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vertical Stats (like Attendance, Homework, Rating) */}
        <div className="bg-theme-card rounded-[32px] p-6 flex flex-col space-y-6 shadow-sm overflow-y-auto custom-scrollbar">

          <div className="flex flex-col items-center justify-center py-4 bg-theme-accent/10 rounded-[24px]">
            <h3 className="text-theme-dark font-medium text-sm mb-4">Overall Accuracy</h3>
            {/* Circular Progress Placeholder using CSS */}
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-theme-bg">
              <div className="absolute inset-1 rounded-full bg-theme-card"></div>
              <span className="relative z-10 text-2xl font-bold text-theme-accent">{(overallAvg * 100).toFixed(0)}%</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="#3b82f6" strokeWidth="8" fill="none" strokeDasharray="276" strokeDashoffset={276 - (276 * overallAvg)} className="transition-all duration-1000" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4 bg-theme-teal/10 rounded-[24px]">
            <h3 className="text-theme-dark font-medium text-sm mb-4">Topics Explored</h3>
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-theme-bg">
              <div className="absolute inset-1 rounded-full bg-theme-card"></div>
              <span className="relative z-10 text-2xl font-bold text-theme-teal">{summary.length}</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="#14b8a6" strokeWidth="8" fill="none" strokeDasharray="276" strokeDashoffset="50" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4 bg-theme-yellow/10 rounded-[24px] flex-1">
            <h3 className="text-theme-dark font-medium text-sm mb-4">Weak Areas</h3>
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-theme-bg">
              <div className="absolute inset-1 rounded-full bg-theme-card"></div>
              <span className="relative z-10 text-2xl font-bold text-theme-yellow">{recommendations.weak_topics.length}</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="#f59e0b" strokeWidth="8" fill="none" strokeDasharray="276" strokeDashoffset={276 - (276 * 0.75)} strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="text-center pt-2 pb-4">
            <span className="text-xs text-theme-dark font-bold cursor-pointer hover:underline">See more &gt;</span>
          </div>

        </div>

      </div>
    </div>
  );
};

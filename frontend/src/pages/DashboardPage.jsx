import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import api from '../services/api';
import { Target, TrendingUp, BookOpen, AlertCircle, PlayCircle, ChevronRight, Sparkles, Activity } from 'lucide-react';

export const DashboardPage = () => {
  const [summary, setSummary] = useState([]);
  const [progress, setProgress] = useState([]);
  const [recommendations, setRecommendations] = useState({ weak_topics: [], study_materials: [], recommended_quizzes: [] });
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          <p className="text-slate-500 font-semibold animate-pulse">Synchronizing Learning Insights...</p>
        </div>
      </div>
    );
  }

  const overallAvg = summary.length 
    ? summary.reduce((acc, curr) => acc + curr.avg_score, 0) / summary.length 
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Premium Hero Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white p-8 md:p-10 rounded-3xl shadow-premium relative overflow-hidden">
        {/* Decorative Glowing Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -mr-28 -mt-28 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-brand-400 bg-brand-950/80 px-3 py-1 rounded-full border border-brand-800/40 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Adaptive Analytics
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-white font-display">
            Your Learning Dashboard
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl font-medium leading-relaxed">
            Track your quiz metrics, identify knowledge gaps, and access real-time AI-tailored study recommendations.
          </p>
        </div>
        
        <div className="relative z-10 bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center space-x-3 self-stretch md:self-auto justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Recommendation Engine Active</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            label: 'Overall Accuracy', 
            val: `${(overallAvg * 100).toFixed(1)}%`, 
            icon: Target, 
            bg: 'bg-brand-50 text-brand-600 border-brand-100/60 shadow-glow-blue/20' 
          },
          { 
            label: 'Topics Explored', 
            val: summary.length, 
            icon: BookOpen, 
            bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/60 shadow-glow-emerald/20' 
          },
          { 
            label: 'Improvement Areas', 
            val: recommendations.weak_topics.length, 
            icon: AlertCircle, 
            bg: 'bg-rose-50 text-rose-600 border-rose-100/60 shadow-glow-purple/20' 
          }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i}
              className="bg-white rounded-2xl p-6 shadow-premium border border-slate-200/80 flex items-center space-x-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <div className={`p-4 rounded-xl border ${card.bg}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{card.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-slate-200/80">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Performance Over Time</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Daily Quiz Accuracy %</span>
          </div>
          
          {progress.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart data={progress}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="attempt_date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    domain={[0, 100]}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                      padding: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="daily_pct" 
                    name="Accuracy %"
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)"
                    dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#0284c7' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
              <Activity className="w-10 h-10 text-slate-300 mb-3 animate-pulse" />
              <p className="font-semibold text-slate-600">No performance logs recorded</p>
              <p className="text-xs text-slate-500 mt-1">Complete a practice quiz to generate performance history.</p>
            </div>
          )}
        </div>

        {/* Focus Areas Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-200/80 flex flex-col">
          <div className="flex items-center space-x-2 mb-6">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-slate-900">Focus Areas</h2>
          </div>
          
          {recommendations.weak_topics.length > 0 ? (
            <ul className="space-y-4 overflow-y-auto flex-1 max-h-72 pr-1">
              {recommendations.weak_topics.map(topic => (
                <li key={topic.topic_id} className="p-4 rounded-xl bg-rose-50/50 border border-rose-100/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900 text-sm">{topic.topic_name}</span>
                    <span className="text-xs font-black text-rose-600">{(topic.avg_score * 100).toFixed(0)}% accuracy</span>
                  </div>
                  <div className="w-full bg-rose-100 rounded-full h-2">
                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${topic.avg_score * 100}%` }}></div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center bg-emerald-50/50 border border-emerald-100 rounded-2xl flex-1 flex flex-col justify-center items-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <Target className="w-6 h-6" />
              </div>
              <p className="font-bold text-emerald-800">Knowledge Map Strong!</p>
              <p className="text-xs text-emerald-600 mt-1">No weak areas identified. Keep it up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Sections */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-6 font-display">Recommended For You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Quizzes */}
          {recommendations.recommended_quizzes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-brand-600" /> Recommended Quizzes
              </h3>
              <div className="space-y-4">
                {recommendations.recommended_quizzes.map(quiz => (
                  <Link 
                    key={quiz.quiz_id} 
                    to={`/quizzes/${quiz.quiz_id}/attempt`}
                    className="block p-5 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors text-base">{quiz.title}</h4>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 mt-2 capitalize">
                          {quiz.topic_name}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-all duration-300">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Study Materials */}
          {recommendations.study_materials.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center">
                <PlayCircle className="w-4 h-4 mr-2 text-purple-600" /> Recommended Study Guides
              </h3>
              <div className="space-y-4">
                {recommendations.study_materials.map(material => (
                  <a 
                    key={material.id} 
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-5 bg-white rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors text-base">{material.title}</h4>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 mt-2 capitalize">
                          {material.material_type}
                        </span>
                        <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">{material.description || 'Access this guide to deepen your grasp of this topic.'}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { Target, TrendingUp, BookOpen, AlertCircle, PlayCircle, ChevronRight } from 'lucide-react';

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
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const overallAvg = summary.length 
    ? summary.reduce((acc, curr) => acc + curr.avg_score, 0) / summary.length 
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Your Learning Dashboard</h1>
        <p className="text-slate-500 mt-2">Track your progress and get personalized recommendations.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-brand-100 p-3 rounded-xl text-brand-600">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Overall Accuracy</p>
            <p className="text-2xl font-bold text-slate-900">{(overallAvg * 100).toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-xl text-green-600">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Topics Covered</p>
            <p className="text-2xl font-bold text-slate-900">{summary.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Areas for Improvement</p>
            <p className="text-2xl font-bold text-slate-900">{recommendations.weak_topics.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-slate-900">Performance Over Time</h2>
          </div>
          {progress.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="attempt_date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    domain={[0, 100]}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="daily_pct" 
                    name="Score %"
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#0284c7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No quiz data available yet. Take a quiz to see your progress!
            </div>
          )}
        </div>

        {/* Weak Topics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 mb-6">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-900">Focus Areas</h2>
          </div>
          {recommendations.weak_topics.length > 0 ? (
            <ul className="space-y-4">
              {recommendations.weak_topics.map(topic => (
                <li key={topic.topic_id} className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-900">{topic.topic_name}</span>
                    <span className="text-sm font-bold text-orange-600">{(topic.avg_score * 100).toFixed(0)}% avg</span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${topic.avg_score * 100}%` }}></div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-green-50 rounded-xl border border-green-100 h-full flex flex-col justify-center items-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                <Target className="w-6 h-6" />
              </div>
              <p className="font-medium text-green-800">You're doing great!</p>
              <p className="text-sm mt-1">No major weak areas detected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Recommended For You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quizzes */}
          {recommendations.recommended_quizzes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-brand-500" /> Practice Quizzes
              </h3>
              {recommendations.recommended_quizzes.map(quiz => (
                <Link 
                  key={quiz.quiz_id} 
                  to={`/quizzes/${quiz.quiz_id}/attempt`}
                  className="block p-5 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all-smooth group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{quiz.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{quiz.topic_name}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Study Materials */}
          {recommendations.study_materials.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                <PlayCircle className="w-5 h-5 mr-2 text-purple-500" /> Study Materials
              </h3>
              {recommendations.study_materials.map(material => (
                <a 
                  key={material.id} 
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-5 bg-white rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all-smooth group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{material.title}</h4>
                      <p className="text-xs font-medium text-purple-600 bg-purple-50 inline-block px-2 py-1 rounded mt-2">{material.material_type}</p>
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{material.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

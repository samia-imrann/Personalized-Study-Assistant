import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export const QuizAttemptPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/quizzes/${id}`);
        setQuiz(res.data);
      } catch (err) {
        console.error("Failed to fetch quiz", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleSelectOption = (questionId, index) => {
    if (result) return; // disable if already submitted
    setAnswers(prev => ({ ...prev, [questionId]: index }));
  };

  const handleSubmit = async () => {
    // Check if all answered
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!window.confirm("You have unanswered questions. Submit anyway?")) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([qId, idx]) => ({
          question_id: parseInt(qId),
          chosen_index: idx
        }))
      };
      const res = await api.post(`/quizzes/${id}/attempt`, payload);
      setResult(res.data);
    } catch (err) {
      console.error("Failed to submit quiz", err);
      alert("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!quiz) return <div className="p-8 text-center">Quiz not found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <button 
        onClick={() => navigate('/quizzes')}
        className="flex items-center text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Quizzes
      </button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">{quiz.title}</h1>
        <p className="text-slate-500 mt-1">{quiz.questions.length} questions</p>
      </div>

      {result ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Quiz Completed!</h2>
            <p className="text-xl text-slate-600 mt-2">You scored <span className="font-bold text-brand-600">{result.score}</span> out of {result.total_questions} ({result.percentage}%)</p>
          </div>

          <div className="space-y-6 mt-8">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Topic Breakdown</h3>
            {result.topic_breakdown.map((tb, idx) => (
              <div key={idx} className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">{tb.topic_name}</span>
                  <span className={`text-sm font-bold ${tb.score < 60 ? 'text-orange-500' : 'text-green-600'}`}>
                    {tb.score}% ({tb.correct}/{tb.total})
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${tb.score < 60 ? 'bg-orange-500' : 'bg-green-500'}`} 
                    style={{ width: `${tb.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => navigate('/quizzes')}
              className="px-6 py-3 bg-slate-200 text-slate-800 rounded-xl font-medium hover:bg-slate-300 transition-colors"
            >
              Take Another Quiz
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {quiz.questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-slate-900">
                  <span className="text-brand-500 font-bold mr-2">{qIndex + 1}.</span> 
                  {q.question_text}
                </h3>
                <span className={`text-xs px-2 py-1 rounded uppercase font-bold tracking-wider ${
                  q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 
                  q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {q.difficulty}
                </span>
              </div>
              
              <div className="space-y-3 mt-4">
                {q.options.map((opt, oIndex) => {
                  const isSelected = answers[q.id] === oIndex;
                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleSelectOption(q.id, oIndex)}
                      className={`w-full flex items-center p-4 rounded-xl border text-left transition-all-smooth ${
                        isSelected 
                          ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-[0_0_0_1px_rgba(14,165,233,1)]' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-500 mr-3 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 mr-3 shrink-0" />
                      )}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center sticky bottom-8 shadow-xl">
            <div className="text-slate-600">
              Answered: <span className="font-bold text-slate-900">{Object.keys(answers).length}</span> / {quiz.questions.length}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length === 0}
              className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

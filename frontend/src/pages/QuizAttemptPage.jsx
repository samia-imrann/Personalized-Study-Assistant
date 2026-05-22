import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, CheckCircle2, Circle, XCircle } from 'lucide-react';

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
      <div className="h-full flex items-center justify-center bg-theme-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  if (!quiz) return <div className="p-8 text-center text-theme-dark">Quiz not found</div>;

  return (
    <div className="h-full flex flex-col max-w-[900px] mx-auto animate-fade-in pb-4">
      {/* Top Navigation Row */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <button 
          onClick={() => navigate('/quizzes')}
          className="flex items-center text-theme-dark/60 hover:text-theme-dark transition-colors font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Quizzes
        </button>
      </div>

      {/* Header Info */}
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-display font-bold text-theme-dark uppercase tracking-wide">{quiz.title}</h1>
        <p className="text-theme-dark/60 text-sm mt-1">{quiz.questions.length} questions</p>
      </div>

      {/* Scrollable Quiz Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        {result ? (
          <div className="space-y-6 pb-6">
            {/* Score Summary Card */}
            <div className="bg-theme-card rounded-[32px] p-8 shadow-sm border border-theme-dark/5 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                result.percentage >= 60 ? 'bg-theme-teal/10 text-theme-teal' : 'bg-theme-pink/10 text-theme-pink'
              }`}>
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-theme-dark">Quiz Completed!</h2>
              <p className="text-lg text-theme-dark/70 mt-2">
                You scored <span className={`font-bold ${ result.percentage >= 60 ? 'text-theme-teal' : 'text-theme-pink'}`}>{result.score}</span> out of {result.total_questions} ({result.percentage}%)
              </p>

              <div className="space-y-4 mt-8 max-w-md mx-auto text-left">
                <h3 className="text-base font-bold text-theme-dark border-b border-theme-dark/10 pb-2">Topic Breakdown</h3>
                {result.topic_breakdown.map((tb, idx) => (
                  <div key={idx} className="flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-theme-dark/80">{tb.topic_name}</span>
                      <span className={`font-bold ${tb.score < 60 ? 'text-theme-pink' : 'text-theme-teal'}`}>
                        {tb.score}% ({tb.correct}/{tb.total})
                      </span>
                    </div>
                    <div className="w-full bg-theme-sidebar rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${tb.score < 60 ? 'bg-theme-blue' : 'bg-theme-teal'}`}
                        style={{ width: `${tb.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2.5 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-full font-bold text-sm transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => navigate('/quizzes')}
                  className="px-6 py-2.5 bg-theme-sidebar hover:bg-theme-sidebar/80 text-theme-dark rounded-full font-bold text-sm transition-colors"
                >
                  Take Another Quiz
                </button>
              </div>
            </div>

            {/* Answer Review Section */}
            <div>
              <h2 className="text-sm font-bold text-theme-dark/70 uppercase tracking-wider mb-4 pl-2">Answer Review</h2>
              <div className="space-y-4">
                {result.question_results.map((qr, qIndex) => (
                  <div key={qr.question_id} className={`bg-theme-card rounded-[32px] p-6 shadow-sm border ${
                    qr.is_correct ? 'border-theme-teal/30' : 'border-theme-pink/30'
                  }`}>
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <h3 className="text-sm font-bold text-theme-dark leading-snug">
                        <span className="text-theme-accent mr-1.5">{qIndex + 1}.</span>
                        {qr.question_text}
                      </h3>
                      {qr.is_correct ? (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] bg-theme-teal/10 text-theme-teal px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Correct
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] bg-theme-pink/10 text-theme-pink px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                          <XCircle className="w-3 h-3" /> Wrong
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {qr.options.map((opt, oIndex) => {
                        const isChosen = qr.chosen_index === oIndex;
                        const isCorrect = qr.correct_index === oIndex;
                        let style = 'border-theme-dark/5 text-theme-dark/60';
                        let Icon = Circle;
                        if (isCorrect) {
                          style = 'border-theme-teal/40 bg-theme-teal/10 text-theme-teal font-bold';
                          Icon = CheckCircle2;
                        } else if (isChosen && !isCorrect) {
                          style = 'border-theme-pink/40 bg-theme-pink/10 text-theme-pink font-bold';
                          Icon = XCircle;
                        }
                        return (
                          <div
                            key={oIndex}
                            className={`w-full flex items-center p-3.5 rounded-2xl border text-sm ${style}`}
                          >
                            <Icon className="w-4 h-4 mr-3 shrink-0" />
                            <span>{opt}</span>
                            {isCorrect && <span className="ml-auto text-[10px] font-black uppercase tracking-wider opacity-70">Correct Answer</span>}
                            {isChosen && !isCorrect && <span className="ml-auto text-[10px] font-black uppercase tracking-wider opacity-70">Your Answer</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            {quiz.questions.map((q, qIndex) => (
              <div key={q.id} className="bg-theme-card rounded-[32px] p-6 shadow-sm border border-theme-dark/5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-base font-bold text-theme-dark flex items-start leading-snug">
                    <span className="text-theme-accent mr-2">{qIndex + 1}.</span> 
                    {q.question_text}
                  </h3>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-black tracking-wider ${
                    q.difficulty === 'easy' ? 'bg-theme-teal/10 text-theme-teal' : 
                    q.difficulty === 'medium' ? 'bg-theme-yellow/10 text-theme-yellow' : 'bg-theme-pink/10 text-theme-pink'
                  }`}>
                    {q.difficulty}
                  </span>
                </div>
                
                <div className="space-y-2.5 mt-4">
                  {q.options.map((opt, oIndex) => {
                    const isSelected = answers[q.id] === oIndex;
                    return (
                      <button
                        key={oIndex}
                        onClick={() => handleSelectOption(q.id, oIndex)}
                        className={`w-full flex items-center p-4 rounded-2xl border text-left transition-all duration-200 text-sm font-semibold ${
                          isSelected 
                            ? 'border-theme-accent bg-theme-accent/5 text-theme-dark shadow-[0_0_0_1px_rgba(59,130,246,1)]' 
                            : 'border-theme-dark/5 hover:border-theme-dark/10 hover:bg-theme-cardHover'
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-theme-accent mr-3 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-theme-dark/20 mr-3 shrink-0" />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Sticky Submission Bar */}
            <div className="bg-theme-card p-5 rounded-[32px] border border-theme-dark/5 flex justify-between items-center shadow-lg sticky bottom-0">
              <div className="text-theme-dark/60 font-semibold text-sm">
                Answered: <span className="font-bold text-theme-dark">{Object.keys(answers).length}</span> / {quiz.questions.length}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(answers).length === 0}
                className="px-6 py-2.5 bg-theme-accent hover:bg-theme-accent/90 disabled:bg-theme-sidebar/50 disabled:text-theme-dark/30 text-white rounded-full font-bold text-sm transition-colors flex items-center"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

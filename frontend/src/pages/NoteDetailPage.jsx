import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Star, Download, Trash2, MessageSquare } from 'lucide-react';

export const NoteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    try {
      const res = await api.get(`/notes/${id}`);
      setNote(res.data);
    } catch (err) {
      console.error("Failed to fetch note detail", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      navigate('/notes');
    } catch (err) {
      alert("Failed to delete note");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await api.post(`/notes/${id}/reviews`, {
        star_rating: reviewRating,
        text: reviewText
      });
      setReviewText('');
      setReviewRating(5);
      fetchNote(); // refresh to show new review
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  if (!note) return <div className="p-8 text-center text-theme-dark">Note not found</div>;

  const isOwner = user?.id === note.uploader_id;
  const hasReviewed = note.reviews.some(r => r.reviewer_id === user?.id);

  return (
    <div className="h-full flex flex-col max-w-[1000px] mx-auto animate-fade-in pb-4">
      {/* Top Navigation Row */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <button 
          onClick={() => navigate('/notes')}
          className="flex items-center text-theme-dark/60 hover:text-theme-dark transition-colors font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Notes
        </button>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 min-h-0 pb-6">
        
        {/* Main Note Card */}
        <div className="bg-theme-card rounded-[32px] p-8 shadow-sm border border-theme-dark/5">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-theme-dark uppercase tracking-wide leading-tight">{note.title}</h1>
              <p className="text-theme-dark/50 text-sm mt-1">
                By <span className="font-semibold">{note.uploader_username}</span> on {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex items-center space-x-3 shrink-0">
              <a 
                href={`${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')}/${note.file_path}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center px-5 py-2 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-full font-bold text-xs transition-colors"
              >
                <Download className="w-4 h-4 mr-1.5" /> Download
              </a>
              {isOwner && (
                <button 
                  onClick={handleDelete}
                  className="flex items-center px-5 py-2 bg-theme-pink/10 hover:bg-theme-pink/20 text-theme-pink rounded-full font-bold text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6 mt-6 pt-6 border-t border-theme-dark/5">
            <div className="flex items-center space-x-1.5 bg-theme-yellow/10 text-theme-yellow px-3.5 py-1.5 rounded-2xl font-black">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-lg leading-none">{note.average_rating.toFixed(1)}</span>
              <span className="text-xs font-semibold opacity-70 ml-1">({note.reviews.length} reviews)</span>
            </div>
            
            <div className="flex space-x-2">
              {note.subject && <span className="bg-theme-sidebar text-theme-dark/70 px-3 py-1 rounded-full text-xs font-bold capitalize">{note.subject}</span>}
              {note.topic && <span className="bg-theme-sidebar text-theme-dark/70 px-3 py-1 rounded-full text-xs font-bold capitalize">{note.topic}</span>}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-bold text-theme-dark/60 uppercase tracking-wider mb-2.5">Description</h3>
            <p className="text-theme-dark/80 text-sm leading-relaxed whitespace-pre-line bg-theme-sidebar/50 p-6 rounded-2xl border border-theme-dark/5">
              {note.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Reviews Panel */}
        <div className="bg-theme-card rounded-[32px] p-8 shadow-sm border border-theme-dark/5">
          <h2 className="text-lg font-bold text-theme-dark font-display uppercase tracking-wide mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-theme-dark/40" /> Reviews
          </h2>

          {!isOwner && !hasReviewed && (
            <form onSubmit={handleSubmitReview} className="mb-6 bg-theme-sidebar/40 p-6 rounded-2xl border border-theme-dark/5">
              <h3 className="font-bold text-theme-dark text-sm mb-4">Write a Review</h3>
              
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Rating</label>
                <div className="flex space-x-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      type="button" 
                      key={star} 
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-7 h-7 ${star <= reviewRating ? 'text-theme-yellow fill-current' : 'text-theme-dark/20'}`} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-dark/50 mb-2 pl-2">Comment (Optional)</label>
                <textarea 
                  className="w-full p-4 rounded-2xl border-none bg-theme-sidebar focus:ring-2 focus:ring-theme-accent text-theme-dark text-sm font-semibold transition-all resize-none" 
                  rows="3" 
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="What did you think of these notes?"
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                disabled={submittingReview}
                className="px-6 py-2 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-full font-bold text-xs transition-colors disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}

          <div className="space-y-4">
            {note.reviews.length === 0 ? (
              <p className="text-theme-dark/40 text-center py-8 text-sm font-medium">No reviews yet. Be the first to review!</p>
            ) : (
              note.reviews.map(review => (
                <div key={review.id} className="p-6 rounded-2xl border border-theme-dark/5 bg-theme-sidebar/20">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-theme-accent/10 flex items-center justify-center text-xs font-bold text-theme-accent">
                        {review.reviewer_username[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-theme-dark text-sm leading-none block">{review.reviewer_username}</span>
                        <p className="text-[10px] text-theme-dark/40 font-semibold mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= review.star_rating ? 'text-theme-yellow fill-current' : 'text-theme-dark/15'}`} />
                      ))}
                    </div>
                  </div>
                  {review.text && <p className="text-theme-dark/80 text-sm leading-relaxed mt-3 pl-1">{review.text}</p>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

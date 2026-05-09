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
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!note) return <div className="p-8 text-center">Note not found</div>;

  const isOwner = user?.id === note.uploader_id;
  const hasReviewed = note.reviews.some(r => r.reviewer_id === user?.id);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <button 
        onClick={() => navigate('/notes')}
        className="flex items-center text-slate-500 hover:text-brand-600 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Notes
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{note.title}</h1>
            <p className="text-slate-500 mt-2">By {note.uploader_username} on {new Date(note.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center space-x-3">
            <a 
              href={`http://localhost:8000/${note.file_path}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-brand-50 text-brand-700 rounded-lg font-medium hover:bg-brand-100 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </a>
            {isOwner && (
              <button 
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-6 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-1 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-bold">
            <Star className="w-5 h-5 fill-current" />
            <span className="text-lg">{note.average_rating.toFixed(1)}</span>
            <span className="text-xs font-normal text-amber-700/70 ml-1">({note.reviews.length} reviews)</span>
          </div>
          
          <div className="flex space-x-2">
            {note.subject && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-medium">{note.subject}</span>}
            {note.topic && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-medium">{note.topic}</span>}
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Description</h3>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-xl border border-slate-100">
            {note.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <MessageSquare className="w-6 h-6 mr-2 text-slate-400" /> Reviews
        </h2>

        {!isOwner && !hasReviewed && (
          <form onSubmit={handleSubmitReview} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Write a Review</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    type="button" 
                    key={star} 
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star className={`w-8 h-8 ${star <= reviewRating ? 'text-amber-400 fill-current' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Comment (Optional)</label>
              <textarea 
                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500" 
                rows="3" 
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="What did you think of these notes?"
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={submittingReview}
              className="px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {note.reviews.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No reviews yet. Be the first to review!</p>
          ) : (
            note.reviews.map(review => (
              <div key={review.id} className="p-6 rounded-xl border border-slate-100 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {review.reviewer_username[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{review.reviewer_username}</span>
                      <p className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= review.star_rating ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
                {review.text && <p className="text-slate-700 mt-3">{review.text}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

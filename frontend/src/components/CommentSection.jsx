import React, { useState, useEffect } from 'react';
import { reportsService } from '../services/reports';
import { useAuth } from '../context/AuthContext';

const CommentSection = ({ reportId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
  }, [reportId]);

  const loadComments = async () => {
    try {
      const data = await reportsService.getComments(reportId);
      setComments(data);
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
      setError('Erreur de chargement des commentaires');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const comment = await reportsService.addComment(reportId, newComment, replyTo?.id);
      if (replyTo) {
        setComments(prev => prev.map(c => c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), comment] } : c));
        setReplyTo(null);
      } else {
        setComments(prev => [comment, ...prev]);
      }
      setNewComment('');
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout du commentaire');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleString('fr-FR');

  if (loading) return <div>Chargement des commentaires...</div>;

  return (
    <div className="comment-section">
      <h3>Commentaires ({comments.length})</h3>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? `Répondre...` : "Ajouter un commentaire..."}
          rows="3"
        />
        {replyTo && (
          <div className="reply-indicator">
            Réponse en cours
            <button type="button" onClick={() => setReplyTo(null)}>Annuler</button>
          </div>
        )}
        <button type="submit">Publier</button>
      </form>
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <span className="user-icon">👤</span>
              <strong>Anonyme</strong>
              <span>{formatDate(comment.created_at)}</span>
            </div>
            <div className="comment-content">{comment.contenu}</div>
            <div className="comment-actions">
              <button onClick={() => setReplyTo(comment)}>Répondre</button>
            </div>
            {comment.replies && comment.replies.length > 0 && (
              <div className="replies">
                {comment.replies.map(reply => (
                  <div key={reply.id} className="reply">
                    <div className="reply-header">
                      <span className="user-icon">👤</span>
                      <strong>Anonyme</strong>
                      <span>{formatDate(reply.created_at)}</span>
                    </div>
                    <div className="reply-content">{reply.contenu}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSection;
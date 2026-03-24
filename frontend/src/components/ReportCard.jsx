import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsService } from '../services/reports';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ReportCard = ({ report, onUpdate }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [witnessed, setWitnessed] = useState(false);
  const [shared, setShared] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes_count || 0);
  const [dislikeCount, setDislikeCount] = useState(report.dislikes_count || 0);
  const [witnessCount, setWitnessCount] = useState(report.witnesses_count || 0);
  const [sharesCount, setSharesCount] = useState(report.shares_count || 0);

  useEffect(() => {
    if (user) {
      loadInteractionStatus();
      loadShareStatus();
    }
  }, [user, report.id]);

  const loadInteractionStatus = async () => {
    try {
      const likeStatus = await reportsService.getLikeStatus(report.id);
      setLiked(likeStatus.liked);
      setDisliked(likeStatus.disliked);
      const witnessStatus = await reportsService.hasWitnessed(report.id);
      setWitnessed(witnessStatus.hasWitnessed);
    } catch (err) {
      console.error('Erreur chargement statuts:', err);
    }
  };

  const loadShareStatus = async () => {
    try {
      const response = await api.get(`/shares/reports/${report.id}/count`);
      setSharesCount(response.data.sharesCount);
      setShared(response.data.hasShared);
    } catch (err) {
      console.error('Erreur chargement partages:', err);
    }
  };

  const handleLike = async () => {
    if (liked) return;
    try {
      const result = await reportsService.like(report.id, 'like');
      setLikeCount(result.likes);
      setDislikeCount(result.dislikes);
      setLiked(true);
      if (disliked) setDisliked(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erreur like:', err);
    }
  };

  const handleDislike = async () => {
    if (disliked) return;
    try {
      const result = await reportsService.like(report.id, 'dislike');
      setLikeCount(result.likes);
      setDislikeCount(result.dislikes);
      setDisliked(true);
      if (liked) setLiked(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erreur dislike:', err);
    }
  };

  const handleWitness = async () => {
    if (witnessed) return;
    try {
      const result = await reportsService.witness(report.id);
      setWitnessCount(result.witnesses);
      setWitnessed(true);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erreur témoignage:', err);
    }
  };

  const handleShare = async () => {
    if (shared) return;
    try {
      const response = await api.post(`/shares/reports/${report.id}`);
      setSharesCount(response.data.sharesCount);
      setShared(true);
      const url = window.location.origin + `/report/${report.id}`;
      if (navigator.share) {
        await navigator.share({ title: report.titre, text: report.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papier');
      }
    } catch (err) {
      console.error('Erreur partage:', err);
    }
  };

  return (
    <div className="report-card">
      <div className="report-header">
        <span className="user-icon">👤</span>
        <span>Anonyme</span>
        <span>{new Date(report.created_at).toLocaleString('fr-FR')}</span>
      </div>
      <h3>{report.titre}</h3>
      <p>{report.description}</p>
      {report.preuves && report.preuves.length > 0 && (
        <div className="evidence">
          {report.preuves.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">Preuve {idx+1}</a>
          ))}
        </div>
      )}
      <div className="actions">
        <button onClick={handleLike} className={liked ? 'active' : ''}>👍 {likeCount}</button>
        <button onClick={handleDislike} className={disliked ? 'active' : ''}>👎 {dislikeCount}</button>
        <button onClick={handleWitness} className={witnessed ? 'active' : ''}>👁️ {witnessCount}</button>
        <button onClick={handleShare} className={shared ? 'active' : ''}>📤 {sharesCount}</button>
        <Link to={`/report/${report.id}`}>💬 Commenter</Link>
      </div>
    </div>
  );
};

export default ReportCard;
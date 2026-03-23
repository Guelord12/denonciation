import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { liveService } from '../services/live';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LiveChat from '../components/LiveChat';
import Layout from '../components/Layout';
import api from '../services/api';

const Live = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinLive, leaveLive, onLiveEnded } = useSocket();
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchLive();
    fetchFollowersInfo();
    joinLive(id);
    const unsubscribeEnded = onLiveEnded((endedLive) => {
      if (endedLive.id === parseInt(id)) setIsLive(false);
    });
    return () => {
      leaveLive(id);
      if (unsubscribeEnded) unsubscribeEnded();
    };
  }, [id]);

  useEffect(() => {
    if (live) {
      setIsLive(live.status === 'live');
      setIsOwner(live.user_id === user?.id);
      setParticipantsCount(live.participantsCount || 0);
    }
  }, [live, user]);

  const fetchLive = async () => {
    try {
      const data = await liveService.getById(id);
      setLive(data);
    } catch (err) {
      setError(t('errors.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowersInfo = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/follows/${user.id}/status`);
      setFollowersCount(response.data.followersCount);
      setIsFollowing(response.data.isFollowing);
    } catch (err) {
      console.error('Erreur chargement followers:', err);
    }
  };

  const handleFollow = async () => {
    if (!live) return;
    try {
      if (isFollowing) {
        await api.delete(`/follows/${live.user_id}`);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await api.post(`/follows/${live.user_id}`);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Erreur follow:', err);
    }
  };

  const handleStartLive = async () => {
    try {
      await liveService.start(id);
      fetchLive();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur démarrage');
    }
  };

  const handleEndLive = async () => {
    try {
      await liveService.end(id);
      fetchLive();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur fin');
    }
  };

  const handleJoinLive = async () => {
    try {
      await api.post(`/lives/${id}/join`);
      fetchLive();
    } catch (err) {
      console.error('Erreur rejoindre:', err);
    }
  };

  if (loading) return <Layout><div className="container text-center">{t('common.loading')}</div></Layout>;
  if (error || !live) return <Layout><div className="container text-center"><p>{error}</p><button onClick={() => navigate('/')}>{t('common.back')}</button></div></Layout>;

  return (
    <Layout>
      <div className="container">
        <div className="live-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '12px' }}>
          <div><h1>{live.titre}</h1><p>{live.description}</p></div>
          <div className="live-stats" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="stat"><span>👥</span><span>{participantsCount} {t('live.participants')}</span></div>
            <div><button onClick={handleFollow} className={`follow-btn ${isFollowing ? 'following' : ''}`}>{isFollowing ? '✓ Abonné' : '+ S\'abonner'} ({followersCount})</button></div>
          </div>
        </div>
        {live.is_premium && <div className="premium-badge">⭐ {t('live.premiumLive')}</div>}
        {isOwner && (
          <div className="host-controls" style={{ marginBottom: '1rem' }}>
            {!isLive ? <button onClick={handleStartLive} className="start-live-btn">🎬 {t('live.startLive')}</button> : <button onClick={handleEndLive} className="end-live-btn">⏹️ {t('live.endLive')}</button>}
          </div>
        )}
        {!isOwner && !isLive && (
          <div className="waiting-message" style={{ textAlign: 'center', padding: '2rem', background: '#f0f0f0', borderRadius: '12px', marginBottom: '1rem' }}>
            <p>{t('live.waiting')}</p>
            <button onClick={handleJoinLive} className="notify-btn">🔔 Être averti au début</button>
          </div>
        )}
        <div className="live-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1rem', marginTop: '1rem' }}>
          <div className="video-player" style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9' }}>
            {isLive ? (
              <video controls autoPlay className="live-video" src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}/stream/${live.stream_key}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="placeholder-player" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                <div className="placeholder-content"><div className="pulsing-dot"></div><p>{t('live.waiting')}</p></div>
              </div>
            )}
          </div>
          <LiveChat liveId={id} isHost={isOwner} />
        </div>
      </div>
    </Layout>
  );
};

export default Live;
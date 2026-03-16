import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getToken, getUserRole } from '../lib/api.js';

const platformLabel = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  facebook: 'Facebook'
};

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getViewerId = () => {
  const key = 'neefl_viewer_id';
  // Use sessionStorage so each tab/session counts as its own viewer (more accurate for "live now").
  // Fallbacks are best-effort; viewer tracking should never crash the page.
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
  } catch {
    // ignore
  }
  const value = window.crypto?.randomUUID ? window.crypto.randomUUID() : `viewer_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
  return value;
};

const getYouTubeId = (link) => {
  try {
    const url = new URL(link);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '');
    }
    if (url.searchParams.get('v')) {
      return url.searchParams.get('v');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const liveIndex = parts.indexOf('live');
    if (liveIndex !== -1 && parts[liveIndex + 1]) {
      return parts[liveIndex + 1];
    }
    if (parts[0] === 'embed' && parts[1]) {
      return parts[1];
    }
  } catch {
    return null;
  }
  return null;
};

const getTwitchChannel = (link) => {
  try {
    const url = new URL(link);
    if (url.hostname.includes('twitch.tv')) {
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
    return null;
  } catch {
    return null;
  }
};

const buildEmbedUrl = (platform, link, muted = false) => {
  if (!platform || !link) return null;
  if (platform === 'youtube') {
    const id = getYouTubeId(link);
    if (!id) return link;
    return `https://www.youtube.com/embed/${id}?autoplay=0&mute=${muted ? 1 : 0}&controls=1`;
  }
  if (platform === 'twitch') {
    const channel = getTwitchChannel(link);
    const parent = window.location.hostname;
    return channel ? `https://player.twitch.tv/?channel=${channel}&parent=${parent}` : link;
  }
  if (platform === 'facebook') {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=0&width=800`;
  }
  return link;
};

export default function Streams() {
  const [searchParams] = useSearchParams();
  const requestedMatchId = searchParams.get('match');
  const token = getToken();
  const role = getUserRole();
  const canSubmit = Boolean(token) && ['admin', 'supervisor', 'referee'].includes(role);
  const canControlLive = Boolean(token) && ['admin', 'supervisor', 'referee'].includes(role);
  const canApproveStream = Boolean(token) && role === 'admin';

  const [matches, setMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [featuredMatchId, setFeaturedMatchId] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [match, setMatch] = useState(null);
  const [stream, setStream] = useState(null);
  const [streamAccessError, setStreamAccessError] = useState('');
  const [liveData, setLiveData] = useState({ score1: 0, score2: 0, clock: null, phase: 'pre_match', status: 'ready' });
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [replay, setReplay] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [viewerInfo, setViewerInfo] = useState({ count: 0, viewers: [] });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatForm, setChatForm] = useState({ guest_name: '', message: '' });
  const [chatStatus, setChatStatus] = useState({ state: 'idle', message: '' });
  const [pendingStreams, setPendingStreams] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [streamForm, setStreamForm] = useState({
    match_id: '',
    stream_platform: 'youtube',
    stream_link: '',
    stream_platform_secondary: 'youtube',
    stream_link_secondary: '',
    stream_link_hd: '',
    stream_link_sd: '',
    stream_link_audio: '',
    access_level: 'public'
  });
  const [liveForm, setLiveForm] = useState({ score1: '', score2: '', clock: '' });
  const [reviewForm, setReviewForm] = useState({ id: '', notes: '' });
  const [clock, setClock] = useState('');
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState('auto');
  const playerRef = useRef(null);

  const mergedMatches = useMemo(() => {
    const map = new Map();
    liveMatches.forEach((item) => map.set(item.id, { ...item, live: true }));
    matches.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, { ...item, live: false });
      }
    });
    return Array.from(map.values());
  }, [liveMatches, matches]);

  const loadOverview = () => {
    Promise.all([
      api('/api/public/upcoming-matches', { auth: false }),
      api('/api/public/live-matches', { auth: false }),
      api('/api/public/featured-match', { auth: false }),
      api('/api/public/sponsors', { auth: false })
    ])
      .then(([upcomingData, liveDataResponse, featured, sponsorData]) => {
        const upcoming = upcomingData.matches || [];
        const live = liveDataResponse.matches || [];
        setMatches(upcoming);
        setLiveMatches(live);
        setFeaturedMatchId(featured.match_id || null);
        setSponsors(sponsorData.sponsors || []);
        if (!selectedMatchId) {
          const preferred = live.find((item) => String(item.id) === String(featured.match_id))
            || upcoming.find((item) => String(item.id) === String(featured.match_id))
            || live[0]
            || upcoming[0];
          if (preferred) {
            setSelectedMatchId(String(preferred.id));
          }
        }
      })
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  const loadPending = () => {
    if (!canApproveStream) return;
    api('/api/live-streams?status=pending')
      .then((data) => setPendingStreams(data.streams || []))
      .catch(() => {});
  };

  const loadLiveData = (matchId) => {
    if (!matchId) return;
    api(`/api/matches/${matchId}/live-data`, { auth: false })
      .then((data) => {
        const payload = data.live || {};
        setLiveData({
          score1: Number.isFinite(payload.score1) ? payload.score1 : 0,
          score2: Number.isFinite(payload.score2) ? payload.score2 : 0,
          clock: payload.clock || null,
          phase: payload.phase || 'pre_match',
          status: payload.status || 'ready'
        });
        setLiveForm({
          score1: payload.score1 ?? 0,
          score2: payload.score2 ?? 0,
          clock: payload.clock || ''
        });
      })
      .catch(() => {});
  };

  const loadStream = (matchId) => {
    if (!matchId) return;
    api(`/api/matches/${matchId}/stream`)
      .then((data) => {
        setStream(data.stream || null);
        setStreamAccessError('');
      })
      .catch((err) => {
        if (err.message === 'login_required' || err.message === 'premium_required') {
          setStreamAccessError(err.message);
        } else {
          setStreamAccessError('');
        }
        setStream(null);
      });
  };

  const loadEvents = (matchId) => {
    if (!matchId) return;
    api(`/api/public/matches/${matchId}/events`, { auth: false })
      .then((data) => setEvents(data.events || []))
      .catch(() => {});
  };

  const loadStats = (matchId) => {
    if (!matchId) return;
    api(`/api/public/matches/${matchId}/stats`, { auth: false })
      .then((data) => setStats(data.stats || null))
      .catch(() => {});
  };

  const loadReplay = (matchId) => {
    if (!matchId) return;
    api(`/api/public/matches/${matchId}/replay`, { auth: false })
      .then((data) => setReplay(data.replay || null))
      .catch(() => {});
  };

  const loadViewers = (matchId) => {
    if (!matchId) return;
    api(`/api/public/matches/${matchId}/viewers`, { auth: false })
      .then((data) => setViewerInfo({ count: data.count || 0, viewers: data.viewers || [] }))
      .catch(() => {});
  };

  const loadChat = (matchId) => {
    if (!matchId) return;
    api(`/api/public/matches/${matchId}/chat`)
      .then((data) => setChatMessages(data.messages || []))
      .catch(() => {});
  };

  const submitChat = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setChatStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/public/matches/${selectedMatchId}/chat`, {
        method: 'POST',
        body: {
          guest_name: chatForm.guest_name || undefined,
          message: chatForm.message
        }
      });
      setChatForm((prev) => ({ ...prev, message: '' }));
      setChatStatus({ state: 'success', message: 'Message sent.' });
      loadChat(selectedMatchId);
    } catch (err) {
      setChatStatus({ state: 'error', message: err.message });
    }
  };

  useEffect(() => {
    loadOverview();
    loadPending();
  }, [canApproveStream]);

  useEffect(() => {
    if (!requestedMatchId) return;
    setSelectedMatchId(String(requestedMatchId));
  }, [requestedMatchId]);

  useEffect(() => {
    if (!selectedMatchId) return;
    api(`/api/matches/${selectedMatchId}`, { auth: false })
      .then((data) => setMatch(data.match))
      .catch(() => {});
    loadStream(selectedMatchId);
    loadLiveData(selectedMatchId);
    loadEvents(selectedMatchId);
    loadStats(selectedMatchId);
    loadReplay(selectedMatchId);
    loadViewers(selectedMatchId);
    loadChat(selectedMatchId);
    setStreamForm((prev) => ({ ...prev, match_id: selectedMatchId }));
    setQuality('auto');
  }, [selectedMatchId]);

  useEffect(() => {
    if (!selectedMatchId) return;
    const interval = setInterval(() => {
      loadLiveData(selectedMatchId);
      loadEvents(selectedMatchId);
      loadStats(selectedMatchId);
      loadStream(selectedMatchId);
      loadViewers(selectedMatchId);
      loadChat(selectedMatchId);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedMatchId]);

  useEffect(() => {
    if (!selectedMatchId) return;
    // Only count a viewer when there is an approved stream to actually watch.
    if (!stream?.id || streamAccessError) return;

    const viewerId = getViewerId();
    let cancelled = false;

    const ping = () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden') return;
      api(`/api/public/matches/${selectedMatchId}/viewer`, {
        method: 'POST',
        body: { viewer_id: viewerId }
      }).catch(() => {});
    };

    // Track immediately, then keep alive.
    ping();
    const interval = window.setInterval(ping, 5000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [selectedMatchId, stream?.id, streamAccessError]);

  useEffect(() => {
    if (!match?.scheduled_at) {
      setClock('TBD');
      return;
    }
    const interval = setInterval(() => {
      const start = new Date(match.scheduled_at).getTime();
      const now = Date.now();
      if (Number.isNaN(start)) {
        setClock('TBD');
        return;
      }
      if (now < start) {
        const diff = start - now;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setClock(`Kickoff in ${mins}m ${secs}s`);
      } else {
        const elapsed = Math.floor((now - start) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setClock(`${mins}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [match]);

  const activeStreamLink = useMemo(() => {
    if (!stream) return null;
    if (quality === 'hd' && stream.stream_link_hd) return stream.stream_link_hd;
    if (quality === 'sd' && stream.stream_link_sd) return stream.stream_link_sd;
    if (quality === 'audio' && stream.stream_link_audio) return stream.stream_link_audio;
    return stream.stream_link;
  }, [stream, quality]);

  const primaryEmbedUrl = useMemo(() => {
    if (!activeStreamLink || !stream?.stream_platform) return null;
    return buildEmbedUrl(stream.stream_platform, activeStreamLink, muted);
  }, [activeStreamLink, stream, muted]);

  const secondaryEmbedUrl = useMemo(() => {
    if (!stream?.stream_link_secondary) return null;
    const platform = stream.stream_platform_secondary || stream.stream_platform;
    return buildEmbedUrl(platform, stream.stream_link_secondary, muted);
  }, [stream, muted]);

  const requestFullscreen = () => {
    if (!playerRef.current) return;
    if (playerRef.current.requestFullscreen) {
      playerRef.current.requestFullscreen();
    }
  };

  const submitStream = async (event) => {
    event.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const matchIdToSubmit = selectedMatchId || streamForm.match_id;
      if (!matchIdToSubmit) {
        setStatus({ state: 'error', message: 'Select a match before adding a stream link.' });
        return;
      }
      const payload = {
        stream_platform: streamForm.stream_platform,
        stream_link: streamForm.stream_link,
        stream_platform_secondary: streamForm.stream_link_secondary ? streamForm.stream_platform_secondary : undefined,
        stream_link_secondary: streamForm.stream_link_secondary || undefined,
        stream_link_hd: streamForm.stream_link_hd || undefined,
        stream_link_sd: streamForm.stream_link_sd || undefined,
        stream_link_audio: streamForm.stream_link_audio || undefined
      };
      if (canApproveStream) {
        payload.access_level = streamForm.access_level;
      }
      const response = await api(`/api/matches/${matchIdToSubmit}/stream`, {
        method: 'POST',
        body: payload
      });
      setStatus({
        state: 'success',
        message: response?.status === 'live' ? 'Stream is live.' : 'Stream submitted. Await approval.'
      });
      setStreamForm({
        match_id: selectedMatchId ? String(selectedMatchId) : streamForm.match_id,
        stream_platform: streamForm.stream_platform || 'youtube',
        stream_link: '',
        stream_platform_secondary: streamForm.stream_platform_secondary || 'youtube',
        stream_link_secondary: '',
        stream_link_hd: '',
        stream_link_sd: '',
        stream_link_audio: '',
        access_level: streamForm.access_level || 'public'
      });
      loadPending();
      loadStream(selectedMatchId);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const approveStream = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/live-streams/${id}/approve`, { method: 'PUT', body: { notes: reviewForm.notes || undefined } });
      setStatus({ state: 'success', message: 'Stream is live.' });
      setReviewForm({ id: '', notes: '' });
      loadPending();
      loadStream(selectedMatchId);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const rejectStream = async (id) => {
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/live-streams/${id}/reject`, { method: 'PUT', body: { notes: reviewForm.notes || undefined } });
      setStatus({ state: 'success', message: 'Stream rejected.' });
      setReviewForm({ id: '', notes: '' });
      loadPending();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const updateLiveData = async (event) => {
    event.preventDefault();
    if (!selectedMatchId) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/matches/${selectedMatchId}/live-data`, {
        method: 'PUT',
        body: {
          score1: Number(liveForm.score1),
          score2: Number(liveForm.score2),
          clock: liveForm.clock || undefined
        }
      });
      setStatus({ state: 'success', message: 'Live score updated.' });
      loadLiveData(selectedMatchId);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const endStream = async () => {
    if (!stream?.id) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/live-streams/${stream.id}/end`, { method: 'PUT', body: { notes: reviewForm.notes || undefined } });
      setStatus({ state: 'success', message: 'Stream ended.' });
      setStream(null);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const kickoffBanner = useMemo(() => {
    if (!match?.scheduled_at) return '';
    const start = new Date(match.scheduled_at).getTime();
    if (Number.isNaN(start)) return '';
    const diff = start - Date.now();
    if (diff > 0 && diff <= 10 * 60 * 1000) {
      return 'Match starting soon';
    }
    return '';
  }, [match]);

  return (
    <div className="grid gap-6">
      {kickoffBanner && (
        <div className="rounded-2xl border border-mint-500/40 bg-sand-100/80 px-4 py-3 text-sm text-mint-500">
          {kickoffBanner}
        </div>
      )}

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="section-title">Live Match Center</h3>
            <p className="section-subtitle">Watch official streams, live scores, and match events.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stream?.stream_platform === 'youtube' && (
              <button className="btn-secondary" type="button" onClick={() => setMuted((prev) => !prev)}>
                {muted ? 'Unmute' : 'Mute'}
              </button>
            )}
            <button className="btn-secondary" type="button" onClick={requestFullscreen}>Full Screen</button>
            <a className="btn-secondary" href="/betting">View Betting Odds</a>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <div ref={playerRef} className="relative overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
              {primaryEmbedUrl && !streamAccessError ? (
                <div className={`grid ${secondaryEmbedUrl ? 'gap-2 md:grid-cols-2' : ''}`}>
                  <div className="relative">
                    <iframe
                      title="Live Stream - Player 1"
                      src={primaryEmbedUrl}
                      className="h-[240px] w-full md:h-[420px]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                    {secondaryEmbedUrl && (
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-sand-100/90 px-3 py-1 text-[10px] font-semibold text-ink-700">
                        Player 1
                      </div>
                    )}
                  </div>
                  {secondaryEmbedUrl && (
                    <div className="relative md:border-l md:border-sand-200">
                      <iframe
                        title="Live Stream - Player 2"
                        src={secondaryEmbedUrl}
                        className="h-[240px] w-full md:h-[420px]"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-sand-100/90 px-3 py-1 text-[10px] font-semibold text-ink-700">
                        Player 2
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid h-[280px] w-full place-items-center text-sm text-ink-500 md:h-[420px]">
                  {streamAccessError === 'login_required' && 'Login required to view this stream.'}
                  {streamAccessError === 'premium_required' && 'Premium access required for this stream.'}
                  {!streamAccessError && 'No approved stream for this match yet.'}
                </div>
              )}

              <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-sand-200 bg-sand-100/90 px-4 py-2 text-xs text-ink-500">
                <p className="font-semibold text-ink-900">
                  {match?.player1_tag || match?.player1_id || 'TBD'} vs {match?.player2_tag || match?.player2_id || 'TBD'}
                </p>
                <p className="text-ink-500">
                  {match?.tournament_name || 'Tournament'} · {liveData.clock || clock}
                  {stream?.id && (
                    <span className="ml-2 rounded-full bg-mint-500/20 px-2 py-0.5 text-[10px] font-semibold text-mint-500">LIVE</span>
                  )}
                </p>
              </div>

              <div className="pointer-events-none absolute right-4 top-4 rounded-2xl border border-mint-500/40 bg-sand-100/90 px-3 py-2 text-xs text-ink-500">
                <p className="text-ink-500">Score</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="score-pill">{liveData.score1 ?? '-'}</span>
                  <span className="score-pill">{liveData.score2 ?? '-'}</span>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">{liveData.phase?.replace('_', ' ')}</p>
              </div>

              <div className="pointer-events-none absolute bottom-4 right-4 rounded-2xl border border-sand-200 bg-sand-100/90 px-4 py-2 text-xs text-ink-500">
                <p className="text-ink-500">Odds</p>
                <p className="mt-1 text-ink-700">
                  H {match?.odds_home ?? '-'} · D {match?.odds_draw ?? '-'} · A {match?.odds_away ?? '-'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="chip">Quality</span>
              <button
                className={`btn-secondary ${quality === 'auto' ? 'border-mint-500/70 text-ink-900' : ''}`}
                type="button"
                onClick={() => setQuality('auto')}
              >
                Auto
              </button>
              <button
                className={`btn-secondary ${quality === 'hd' ? 'border-mint-500/70 text-ink-900' : ''}`}
                type="button"
                onClick={() => setQuality('hd')}
                disabled={!stream?.stream_link_hd}
              >
                HD
              </button>
              <button
                className={`btn-secondary ${quality === 'sd' ? 'border-mint-500/70 text-ink-900' : ''}`}
                type="button"
                onClick={() => setQuality('sd')}
                disabled={!stream?.stream_link_sd}
              >
                SD
              </button>
              <button
                className={`btn-secondary ${quality === 'audio' ? 'border-mint-500/70 text-ink-900' : ''}`}
                type="button"
                onClick={() => setQuality('audio')}
                disabled={!stream?.stream_link_audio}
              >
                Audio
              </button>
              {stream?.access_level && (
                <span className="chip">Access: {stream.access_level}</span>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="scoreboard">
              <p className="label">Match Details</p>
              <div className="mt-3 grid gap-2 text-sm text-ink-700">
                <div className="flex items-center justify-between gap-2">
                  <span>Home</span>
                  <span className="font-semibold text-ink-900">{match?.player1_tag || 'TBD'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Team</span>
                  <span>{match?.player1_team || 'eFootball'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Away</span>
                  <span className="font-semibold text-ink-900">{match?.player2_tag || 'TBD'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Team</span>
                  <span>{match?.player2_team || 'eFootball'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Tournament</span>
                  <span>{match?.tournament_name || 'TBD'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Round</span>
                  <span>{match?.round || 'Match'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Referee</span>
                  <span>{match?.referee_tag || 'TBD'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Venue</span>
                  <span>Online</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Betting</span>
                  <span className="font-semibold text-ink-900">{match?.betting_status || 'open'}</span>
                </div>
              </div>
            </div>

            <div className="scoreboard">
              <p className="label">Live Viewers</p>
              <p className="mt-3 text-sm text-ink-700">
                {viewerInfo.count} watching now
                {viewerInfo.count > viewerInfo.viewers.length && (
                  <span className="ml-2 text-xs text-ink-500">
                    ({viewerInfo.count - viewerInfo.viewers.length} guests)
                  </span>
                )}
              </p>
              <div className="mt-3 grid gap-1 text-xs text-ink-500">
                {viewerInfo.viewers.map((viewer) => (
                  <span key={viewer.user_id}>{viewer.gamer_tag}</span>
                ))}
                {!viewerInfo.viewers.length && viewerInfo.count === 0 && <span>No viewers yet.</span>}
                {!viewerInfo.viewers.length && viewerInfo.count > 0 && (
                  <span>Guests are watching. Log in to show your gamer tag.</span>
                )}
              </div>
            </div>

            <div className="scoreboard">
              <p className="label">Live Stats</p>
              {stats ? (
                <div className="mt-3 grid gap-2 text-xs text-ink-500">
                  <div className="flex items-center justify-between">
                    <span>Possession</span>
                    <span>{stats.possession_home}% - {stats.possession_away}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shots</span>
                    <span>{stats.shots_home} - {stats.shots_away}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Passes</span>
                    <span>{stats.passes_home} - {stats.passes_away}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fouls</span>
                    <span>{stats.fouls_home} - {stats.fouls_away}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cards</span>
                    <span>Y {stats.yellow_home}-{stats.yellow_away} · R {stats.red_home}-{stats.red_away}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-500">Live stats will appear once updated by admin.</p>
              )}
            </div>

            <div className="scoreboard">
              <p className="label">Match Events</p>
              <div className="mt-3 grid gap-2 text-xs text-ink-500">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between">
                    <span>{event.minute !== null ? `${event.minute}'` : '--'}</span>
                    <span className="font-semibold text-ink-900">{event.event_type.replace('_', ' ')}</span>
                    <span>{event.side}</span>
                  </div>
                ))}
                {!events.length && <p className="text-xs text-ink-500">No events recorded yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="section-title">Switch Live Match</h3>
            <p className="section-subtitle">Choose any scheduled or live match.</p>
          </div>
          {featuredMatchId && (
            <span className="chip">Featured Match ID: {featuredMatchId}</span>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            className="input"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
          >
            <option value="">Select match</option>
            {mergedMatches.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} {item.player1_tag || 'TBD'} vs {item.player2_tag || 'TBD'} {item.live ? '(Live)' : ''}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="button" onClick={loadOverview}>Refresh List</button>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Upcoming Matches</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedMatchId(String(item.id))}
              className={`scoreboard text-left transition ${
                String(selectedMatchId) === String(item.id) ? 'border-mint-500/70 glow-ring' : ''
              }`}
            >
              <p className="text-sm font-semibold text-ink-900">{item.player1_tag || 'TBD'} vs {item.player2_tag || 'TBD'}</p>
              <p className="text-xs text-ink-500">{item.tournament_name} · {formatDateTime(item.scheduled_at)}</p>
            </button>
          ))}
          {!matches.length && (
            <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
              No upcoming matches scheduled.
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Live Chat</h3>
        <p className="section-subtitle">Talk with the community while the match is on.</p>
        <div className="mt-4 grid gap-3">
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-sand-200 bg-sand-50 p-4 text-xs text-ink-500">
            {chatMessages.map((message) => (
              <div key={message.id} className="mb-2">
                <span className="font-semibold text-ink-900">{message.guest_name || `User ${message.user_id}`}</span>
                <span className="ml-2 text-ink-500">{new Date(message.created_at).toLocaleTimeString()}</span>
                <p className="mt-1 text-ink-700">{message.message}</p>
              </div>
            ))}
            {!chatMessages.length && <p>No chat messages yet.</p>}
          </div>
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submitChat}>
            {!token && (
              <input
                className="input"
                placeholder="Display name"
                value={chatForm.guest_name}
                onChange={(e) => setChatForm((prev) => ({ ...prev, guest_name: e.target.value }))}
                required
              />
            )}
            <input
              className="input"
              placeholder="Type your message"
              value={chatForm.message}
              onChange={(e) => setChatForm((prev) => ({ ...prev, message: e.target.value }))}
              required
            />
            <button className="btn-primary" type="submit">Send</button>
          </form>
          {chatStatus.message && (
            <p className={`text-sm ${chatStatus.state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>
              {chatStatus.message}
            </p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Replay & Highlights</h3>
        {replay ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink-500">
            {replay.replay_url && (
              <a className="btn-secondary" href={replay.replay_url} target="_blank" rel="noreferrer">Watch Replay</a>
            )}
            {replay.highlights_url && (
              <a className="btn-secondary" href={replay.highlights_url} target="_blank" rel="noreferrer">Highlights</a>
            )}
            {!replay.replay_url && !replay.highlights_url && (
              <p className="text-sm text-ink-500">No replay links yet.</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-500">Replay links will appear after admin publishes them.</p>
        )}
      </section>

      {sponsors.length > 0 && (
        <section className="card p-6">
          <h3 className="section-title">Sponsors</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {sponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                className="scoreboard flex items-center justify-center"
                href={sponsor.website_url || '#'}
                target="_blank"
                rel="noreferrer"
              >
                <span className="text-sm font-semibold text-ink-900">{sponsor.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {canSubmit && (
        <section className="card p-6">
          <h3 className="section-title">Submit Live Stream</h3>
          <p className="section-subtitle">Admins can go live instantly. Players and referees submit proof streams for review.</p>
          <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={submitStream}>
            <div>
              <label className="label">Selected Match</label>
              <input
                className="input"
                value={streamForm.match_id || ''}
                disabled
                placeholder="Choose a match from the switcher above"
              />
            </div>
            <div>
              <label className="label">Platform</label>
              <select
                className="input"
                value={streamForm.stream_platform}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_platform: e.target.value }))}
              >
                <option value="youtube">YouTube</option>
                <option value="twitch">Twitch</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="label">Stream Link (default)</label>
              <input
                className="input"
                value={streamForm.stream_link}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link: e.target.value }))}
                placeholder="YouTube: https://youtube.com/watch?v=VIDEO_ID (or embed/live_stream link)"
                required
              />
              {streamForm.stream_platform === 'youtube' && (
                <p className="mt-1 text-xs text-ink-500">
                  Tip: YouTube handle links like <span className="font-semibold">/&#64;channel/live</span> usually cannot be embedded.
                  Use a video link or an embed link like <span className="font-semibold">youtube.com/embed/live_stream?channel=CHANNEL_ID</span>.
                </p>
              )}
            </div>
            <div>
              <label className="label">Secondary Platform</label>
              <select
                className="input"
                value={streamForm.stream_platform_secondary}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_platform_secondary: e.target.value }))}
              >
                <option value="youtube">YouTube</option>
                <option value="twitch">Twitch</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="label">Secondary Stream Link</label>
              <input
                className="input"
                value={streamForm.stream_link_secondary}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_secondary: e.target.value }))}
                placeholder="Second player stream link"
              />
            </div>
            <div>
              <label className="label">HD Link (optional)</label>
              <input
                className="input"
                value={streamForm.stream_link_hd}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_hd: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">SD Link (optional)</label>
              <input
                className="input"
                value={streamForm.stream_link_sd}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_sd: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Audio Link (optional)</label>
              <input
                className="input"
                value={streamForm.stream_link_audio}
                onChange={(e) => setStreamForm((prev) => ({ ...prev, stream_link_audio: e.target.value }))}
              />
            </div>
            {canApproveStream && (
              <div>
                <label className="label">Access Level</label>
                <select
                  className="input"
                  value={streamForm.access_level}
                  onChange={(e) => setStreamForm((prev) => ({ ...prev, access_level: e.target.value }))}
                >
                  <option value="public">Public</option>
                  <option value="registered">Registered</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            )}
            <div className="md:col-span-3">
              <button className="btn-primary" type="submit">Submit Stream</button>
            </div>
          </form>
        </section>
      )}

      {canControlLive && (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Live Score Control</h3>
              <p className="section-subtitle">Update the scoreboard overlay for the selected match.</p>
            </div>
            {canApproveStream && stream?.id && (
              <button className="btn-secondary" type="button" onClick={endStream}>End Stream</button>
            )}
          </div>
          <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={updateLiveData}>
            <div>
              <label className="label">Home Score</label>
              <input
                className="input"
                type="number"
                min="0"
                value={liveForm.score1}
                onChange={(e) => setLiveForm((prev) => ({ ...prev, score1: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Away Score</label>
              <input
                className="input"
                type="number"
                min="0"
                value={liveForm.score2}
                onChange={(e) => setLiveForm((prev) => ({ ...prev, score2: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Clock (MM:SS)</label>
              <input
                className="input"
                value={liveForm.clock}
                onChange={(e) => setLiveForm((prev) => ({ ...prev, clock: e.target.value }))}
                placeholder="45:00"
              />
            </div>
            <div className="md:col-span-3">
              <button className="btn-primary" type="submit">Update Live Score</button>
            </div>
          </form>
        </section>
      )}

      {canApproveStream && (
        <section className="card p-6">
          <h3 className="section-title">Pending Stream Approvals</h3>
          <div className="mt-4 grid gap-3">
            {pendingStreams.map((item) => (
              <div key={item.id} className="scoreboard">
                <p className="text-xs text-ink-500">
                  Match #{item.match_id} · {platformLabel[item.stream_platform]}
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {item.player1_tag || 'TBD'} vs {item.player2_tag || 'TBD'}
                </p>
                <a className="text-xs text-mint-500" href={item.stream_link} target="_blank" rel="noreferrer">
                  View Stream Link
                </a>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => approveStream(item.id)}>Go Live</button>
                  <button className="btn-secondary" type="button" onClick={() => rejectStream(item.id)}>Reject</button>
                </div>
              </div>
            ))}
            {!pendingStreams.length && (
              <p className="text-sm text-ink-500">No pending streams.</p>
            )}
          </div>
          <div className="mt-4">
            <label className="label">Review Notes</label>
            <textarea
              className="input min-h-[90px]"
              value={reviewForm.notes}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes to attach to approval/rejection"
            />
          </div>
        </section>
      )}

      {status.message && (
        <p className={`text-sm ${status.state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}

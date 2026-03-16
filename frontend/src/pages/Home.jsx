import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken, getUserRole } from '../lib/api.js';
import BallIcon from '../components/BallIcon.jsx';
import Countdown from '../components/Countdown.jsx';
import CompetitionTimeline from '../components/CompetitionTimeline.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function Home() {
  const token = getToken();
  const role = getUserRole();
  const { permissions } = usePermissions();
  const [status, setStatus] = useState({ state: 'loading', data: null, error: null });
  const [sponsors, setSponsors] = useState([]);
  const welcomeVideoId = 'By7ef_664qk';

  useEffect(() => {
    let mounted = true;
    api('/api/public/overview', { auth: false })
      .then((data) => {
        if (mounted) {
          setStatus({ state: 'ready', data, error: null });
        }
      })
      .catch((err) => {
        if (mounted) {
          setStatus({ state: 'error', data: null, error: err.message });
        }
      });
    api('/api/public/sponsors', { auth: false })
      .then((data) => {
        if (mounted) {
          setSponsors(data.sponsors || []);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const upcoming = useMemo(() => status.data?.upcoming || [], [status.data]);
  const live = useMemo(() => status.data?.live || [], [status.data]);
  const results = useMemo(() => status.data?.results || [], [status.data]);

  const quickLinks = useMemo(() => {
    if (!token) {
        return [
          { label: 'Match Hub', desc: 'Upcoming fixtures', path: '/matches', style: 'tile-teal', module: 'matches' },
          { label: 'Live Arena', desc: 'Watch streams', path: '/streams', style: 'tile-magenta', module: 'streams' },
          { label: 'Leaderboard', desc: 'Top players', path: '/leaderboard', style: 'tile-gold' },
          { label: 'Login', desc: 'Access player tools', path: '/login', style: 'tile-lime' }
        ];
      }
    if (role === 'admin') {
      return [
        { label: 'Admin HQ', desc: 'System overview', path: '/admin', style: 'tile-teal', module: 'admin' },
        { label: 'Match Review', desc: 'Approve results', path: '/admin/matches', style: 'tile-magenta', module: 'admin' },
        { label: 'Live Control', desc: 'Broadcast tools', path: '/admin/live', style: 'tile-gold', module: 'admin' },
        { label: 'Settings', desc: 'Policies & rules', path: '/admin/settings', style: 'tile-lime', module: 'admin' }
      ];
    }
    if (role === 'director') {
      return [
        { label: 'Director Hub', desc: 'League oversight', path: '/staff', style: 'tile-teal', module: 'staff' },
        { label: 'Tournaments', desc: 'Manage schedules', path: '/tournaments', style: 'tile-magenta', module: 'tournaments' },
        { label: 'Live Arena', desc: 'Watch streams', path: '/streams', style: 'tile-gold', module: 'streams' },
        { label: 'Announcements', desc: 'Publish updates', path: '/notifications', style: 'tile-lime', module: 'notifications' }
      ];
    }
    if (role === 'supervisor' || role === 'referee') {
      return [
        { label: 'Staff Hub', desc: 'Operations', path: '/staff', style: 'tile-teal', module: 'staff' },
        { label: 'Match Review', desc: 'Verify results', path: '/staff/matches', style: 'tile-magenta', module: 'staff' },
        { label: 'Live Arena', desc: 'Watch streams', path: '/streams', style: 'tile-gold', module: 'streams' },
        { label: 'Community', desc: 'Players online', path: '/community', style: 'tile-lime', module: 'community' }
      ];
    }
    if (role === 'moderator') {
      return [
        { label: 'Moderator', desc: 'Resolve disputes', path: '/moderator', style: 'tile-teal', module: 'staff' },
        { label: 'Match Review', desc: 'Verify results', path: '/staff/matches', style: 'tile-magenta', module: 'staff' },
        { label: 'Disputes', desc: 'Case management', path: '/staff/disputes', style: 'tile-gold', module: 'disputes' },
        { label: 'Community', desc: 'Players online', path: '/community', style: 'tile-lime', module: 'community' }
      ];
    }
    if (role === 'broadcaster') {
      return [
        { label: 'Broadcast', desc: 'Stream console', path: '/broadcaster', style: 'tile-teal', module: 'streams' },
        { label: 'Live Arena', desc: 'Watch streams', path: '/streams', style: 'tile-magenta', module: 'streams' },
        { label: 'Upcoming', desc: 'Match schedule', path: '/matches', style: 'tile-gold', module: 'matches' },
        { label: 'Rules', desc: 'League policies', path: '/policies/rulebook', style: 'tile-lime', module: 'policies' }
      ];
    }
    if (role === 'fan') {
      return [
        { label: 'Fan Hub', desc: 'Live matches', path: '/fan/dashboard', style: 'tile-teal', module: 'matches' },
        { label: 'Upcoming', desc: 'Match schedule', path: '/matches', style: 'tile-magenta', module: 'matches' },
        { label: 'Leaderboard', desc: 'Top players', path: '/leaderboard', style: 'tile-gold' },
        { label: 'Betting', desc: 'Odds preview', path: '/betting', style: 'tile-lime', module: 'betting' }
      ];
    }
    if (role === 'bettor') {
      return [
        { label: 'Betting Hub', desc: 'Active bets', path: '/bettor/dashboard', style: 'tile-teal', module: 'betting' },
        { label: 'Place Bet', desc: 'Live odds', path: '/betting', style: 'tile-magenta', module: 'betting' },
        { label: 'Wallet', desc: 'Balance', path: '/payments', style: 'tile-gold', module: 'wallet' },
        { label: 'Results', desc: 'Match outcomes', path: '/matches', style: 'tile-lime', module: 'matches' }
      ];
    }
    if (role === 'coach') {
      return [
        { label: 'Team Hub', desc: 'Manage squad', path: '/player/dashboard', style: 'tile-teal', module: 'matches' },
        { label: 'Tournaments', desc: 'League entries', path: '/player/tournaments', style: 'tile-magenta', module: 'tournaments' },
        { label: 'Community', desc: 'Connect players', path: '/community', style: 'tile-gold', module: 'community' },
        { label: 'Messages', desc: 'Team chats', path: '/messages', style: 'tile-lime', module: 'messages' }
      ];
    }
    return [
      { label: 'Match Hub', desc: 'My fixtures', path: '/player/matches', style: 'tile-teal', module: 'matches' },
      { label: 'Tournaments', desc: 'Join leagues', path: '/player/tournaments', style: 'tile-magenta', module: 'tournaments' },
      { label: 'Betting', desc: 'Place bets', path: '/betting', style: 'tile-gold', module: 'betting' },
      { label: 'Wallet', desc: 'Payments', path: '/payments', style: 'tile-lime', module: 'wallet' }
    ];
  }, [token, role]);

  return (
    <div className="grid gap-8">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label">Welcome</p>
            <h2 className="section-title">NEEFL Kickoff Intro</h2>
          </div>
          <span className="chip">Autoplay · Muted</span>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-sand-50 shadow-[0_0_40px_rgba(18,247,210,0.2)]">
            <div className="relative aspect-video w-full">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/By7ef_664qk?autoplay=1&mute=1&loop=1&playlist=By7ef_664qk&playsinline=1"
                title="eFootball™ 2022 Official Mobile Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <a
            className="text-sm text-mint-500 underline-offset-4 hover:underline"
            href={`https://youtu.be/${welcomeVideoId}`}
            target="_blank"
            rel="noreferrer"
          >
            Watch on YouTube
          </a>
        </div>
      </section>

      <section className="card relative overflow-hidden p-8">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-mint-500/10 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="label">NEEFL eFootball League</p>
            <h1 className="mt-3 text-5xl font-semibold text-ink-900">Feel the stadium energy. Play and bet live.</h1>
            <p className="mt-4 text-base text-ink-500">
              Watch upcoming fixtures, track live results, and place bets when you are signed in. Only approved
              accounts can access full features.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" to="/matches">
                <span className="flex items-center gap-2">
                  <BallIcon className="h-4 w-4" />
                  View Matches
                </span>
              </Link>
              <Link className="btn-secondary" to="/betting">
                <span className="flex items-center gap-2">
                  <BallIcon className="h-4 w-4" />
                  Betting Odds
                </span>
              </Link>
              <Link className="btn-ghost" to="/login">Login</Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="scoreboard">
              <p className="label">Live</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-700">Matches in review</p>
                  <p className="text-3xl font-semibold text-ink-900">{live.length}</p>
                </div>
                <div className="score-pill glow-ring">LIVE</div>
              </div>
            </div>
            <div className="scoreboard">
              <p className="label">Upcoming</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-700">Scheduled fixtures</p>
                  <p className="text-3xl font-semibold text-ink-900">{upcoming.length}</p>
                </div>
                <div className="score-pill">NEXT</div>
              </div>
            </div>
            <div className="scoreboard">
              <p className="label">Results</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-700">Verified results</p>
                  <p className="text-3xl font-semibold text-ink-900">{results.length}</p>
                </div>
                <div className="score-pill">FINAL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Upcoming Matches</h3>
            <Link className="btn-ghost" to="/matches">Full Schedule</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {upcoming.map((match) => (
              <div key={match.id} className="scoreboard">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {match.player1_tag || 'TBD'} vs {match.player2_tag || 'TBD'}
                  </p>
                  <p className="text-xs text-ink-500">{match.tournament_name} · {match.round || 'Match'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-ink-500">
                  <span>{formatDateTime(match.scheduled_at)}</span>
                  <Countdown target={match.scheduled_at} />
                </div>
              </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                  <span>Home {match.odds_home}</span>
                  <span>Draw {match.odds_draw}</span>
                  <span>Away {match.odds_away}</span>
                </div>
              </div>
            ))}
            {!upcoming.length && (
              <div className="rounded-2xl border border-dashed border-sand-200 p-6 text-sm text-ink-500">
                No upcoming matches yet.
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="card p-6">
            <h3 className="section-title">Live Results</h3>
            <div className="mt-4 grid gap-3">
              {live.map((match) => (
                <div key={match.id} className="scoreboard">
                  <p className="text-xs text-ink-500">{match.tournament_name}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink-900">{match.player1_tag || 'TBD'}</span>
                    <span className="score-pill glow-ring">{match.score1 ?? '-'}</span>
                    <span className="score-pill glow-ring">{match.score2 ?? '-'}</span>
                    <span className="text-sm font-semibold text-ink-900">{match.player2_tag || 'TBD'}</span>
                  </div>
                </div>
              ))}
              {!live.length && (
                <p className="text-sm text-ink-500">No live matches right now.</p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="section-title">Latest Results</h3>
            <div className="mt-4 grid gap-3">
              {results.map((match) => (
                <div key={match.id} className="scoreboard">
                  <p className="text-xs text-ink-500">{match.tournament_name}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink-900">{match.player1_tag || 'TBD'}</span>
                    <span className="score-pill">{match.score1 ?? '-'}</span>
                    <span className="score-pill">{match.score2 ?? '-'}</span>
                    <span className="text-sm font-semibold text-ink-900">{match.player2_tag || 'TBD'}</span>
                  </div>
                </div>
              ))}
              {!results.length && (
                <p className="text-sm text-ink-500">No results published yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">Quick Access</h3>
        <p className="section-subtitle">Jump straight into the action.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {quickLinks.filter((item) => !item.module || permissions?.[item.module] !== false).map((item) => (
            <Link key={item.label} className={`tile ${item.style}`} to={item.path}>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs opacity-80">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <CompetitionTimeline />

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

      {status.state === 'error' && (
        <p className="text-sm text-red-400">{status.error}</p>
      )}
    </div>
  );
}

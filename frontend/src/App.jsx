import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import AuthLogin from './pages/AuthLogin.jsx';
import AuthRegister from './pages/AuthRegister.jsx';
import AuthReset from './pages/AuthReset.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Profile from './pages/Profile.jsx';
import PlayerDashboard from './pages/PlayerDashboard.jsx';
import Tournaments from './pages/Tournaments.jsx';
import Matches from './pages/Matches.jsx';
import PublicMatches from './pages/PublicMatches.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Payments from './pages/Payments.jsx';
import Streams from './pages/Streams.jsx';
import Disputes from './pages/Disputes.jsx';
import Notifications from './pages/Notifications.jsx';
import Support from './pages/Support.jsx';
import Community from './pages/Community.jsx';
import Clubs from './pages/Clubs.jsx';
import PolicyPage from './pages/PolicyPage.jsx';
import PlayerProfileView from './pages/PlayerProfileView.jsx';
import FanDashboard from './pages/FanDashboard.jsx';
import BettorDashboard from './pages/BettorDashboard.jsx';
import ModeratorDashboard from './pages/ModeratorDashboard.jsx';
import BroadcasterDashboard from './pages/BroadcasterDashboard.jsx';
import Admin from './pages/Admin.jsx';
import AdminPlayers from './pages/AdminPlayers.jsx';
import AdminTournaments from './pages/AdminTournaments.jsx';
import AdminMatches from './pages/AdminMatches.jsx';
import AdminPayments from './pages/AdminPayments.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import AdminLiveControl from './pages/AdminLiveControl.jsx';
import Settings from './pages/Settings.jsx';
import Betting from './pages/Betting.jsx';
import StaffDashboard from './pages/StaffDashboard.jsx';
import StaffMatches from './pages/StaffMatches.jsx';
import StaffDisputes from './pages/StaffDisputes.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import RequireStaff from './components/RequireStaff.jsx';
import RequireRole from './components/RequireRole.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/register" element={<AuthRegister />} />
          <Route path="/auth/login" element={<AuthLogin />} />
          <Route path="/auth/register" element={<AuthRegister />} />
          <Route path="/auth/reset" element={<AuthReset />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/matches" element={<PublicMatches />} />
          <Route path="/policies/:slug" element={<PolicyPage />} />
          <Route path="/players/:id" element={<PlayerProfileView />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/betting" element={<Betting />} />
          <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
          <Route path="/clubs" element={<RequireAuth><Clubs /></RequireAuth>} />
          <Route path="/player/dashboard" element={<RequireAuth><PlayerDashboard /></RequireAuth>} />
          <Route path="/fan/dashboard" element={<RequireRole roles={['fan']} permission="matches"><FanDashboard /></RequireRole>} />
          <Route path="/bettor/dashboard" element={<RequireRole roles={['bettor']} permission="betting"><BettorDashboard /></RequireRole>} />
          <Route path="/moderator" element={<RequireRole roles={['moderator']} permission="staff"><ModeratorDashboard /></RequireRole>} />
          <Route path="/broadcaster" element={<RequireRole roles={['broadcaster']} permission="streams"><BroadcasterDashboard /></RequireRole>} />
          <Route path="/player/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/player/tournaments" element={<RequireAuth><Tournaments /></RequireAuth>} />
          <Route path="/player/matches" element={<RequireAuth><Matches /></RequireAuth>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/streams" element={<Streams />} />
          <Route path="/disputes" element={<RequireAuth><Disputes /></RequireAuth>} />
          <Route path="/support" element={<RequireAuth><Support /></RequireAuth>} />
          <Route path="/staff" element={<RequireStaff><StaffDashboard /></RequireStaff>} />
          <Route path="/staff/matches" element={<RequireStaff><StaffMatches /></RequireStaff>} />
          <Route path="/staff/disputes" element={<RequireStaff><StaffDisputes /></RequireStaff>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="/admin/players" element={<RequireAdmin><AdminPlayers /></RequireAdmin>} />
          <Route path="/admin/tournaments" element={<RequireAdmin><AdminTournaments /></RequireAdmin>} />
          <Route path="/admin/matches" element={<RequireAdmin><AdminMatches /></RequireAdmin>} />
          <Route path="/admin/live" element={<RequireAdmin><AdminLiveControl /></RequireAdmin>} />
          <Route path="/admin/payments" element={<RequireAdmin><AdminPayments /></RequireAdmin>} />
          <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
          <Route path="/admin/settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

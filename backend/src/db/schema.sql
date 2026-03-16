CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin','director','supervisor','referee','coach','fan','bettor','moderator','broadcaster')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','banned')),
  is_premium SMALLINT NOT NULL DEFAULT 0,
  email_verified_at TIMESTAMP NULL,
  phone_verified_at TIMESTAMP NULL,
  date_of_birth DATE NULL,
  last_seen_at TIMESTAMP NULL,
  privacy_profile TEXT NOT NULL DEFAULT 'public' CHECK (privacy_profile IN ('public','friends','private')),
  privacy_presence SMALLINT NOT NULL DEFAULT 1,
  privacy_friend_requests SMALLINT NOT NULL DEFAULT 1,
  privacy_follow SMALLINT NOT NULL DEFAULT 1,
  kyc_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified','pending','verified','rejected')),
  kyc_verified_at TIMESTAMP NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  user_id BIGINT PRIMARY KEY,
  gamer_tag VARCHAR(64) UNIQUE NOT NULL,
  real_name VARCHAR(128),
  country VARCHAR(64),
  region VARCHAR(64),
  preferred_team VARCHAR(64),
  rank_points INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  goals_scored INT NOT NULL DEFAULT 0,
  division VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_players_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS seasons (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  entry_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  prize_pool NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NULL,
  name VARCHAR(128) NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('league','knockout','group','hybrid')),
  entry_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  prize_pool NUMERIC(12,2) NOT NULL DEFAULT 0,
  rules TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','ongoing','completed')),
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tournaments_season FOREIGN KEY (season_id) REFERENCES seasons(id),
  CONSTRAINT fk_tournaments_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'KES',
  type TEXT NOT NULL CHECK (type IN ('entry_fee','prize_payout','wallet_topup','refund')),
  method TEXT NOT NULL DEFAULT 'mpesa' CHECK (method IN ('mpesa')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','reversed')),
  provider_ref VARCHAR(128) NULL,
  metadata JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id BIGSERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','approved','withdrawn')),
  payment_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tournament_id, player_id),
  CONSTRAINT fk_entries_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  CONSTRAINT fk_entries_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_entries_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS season_entries (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','approved','withdrawn')),
  payment_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (season_id, player_id),
  CONSTRAINT fk_season_entries_season FOREIGN KEY (season_id) REFERENCES seasons(id),
  CONSTRAINT fk_season_entries_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_season_entries_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  round VARCHAR(64),
  player1_id BIGINT NOT NULL,
  player2_id BIGINT NOT NULL,
  referee_id BIGINT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','played','submitted','confirmed','disputed','forfeit','approved')),
  score1 INT NULL,
  score2 INT NULL,
  winner_id BIGINT NULL,
  live_score1 INT NULL,
  live_score2 INT NULL,
  live_clock VARCHAR(16) NULL,
  live_status TEXT NOT NULL DEFAULT 'ready' CHECK (live_status IN ('ready','live','paused','ended','emergency')),
  live_phase TEXT NOT NULL DEFAULT 'pre_match' CHECK (live_phase IN ('pre_match','first_half','half_time','second_half','extra_time','penalties','full_time')),
  live_timer_mode TEXT NOT NULL DEFAULT 'manual' CHECK (live_timer_mode IN ('manual','auto')),
  live_timer_started_at TIMESTAMP NULL,
  live_timer_offset_seconds INT NOT NULL DEFAULT 0,
  betting_status TEXT NOT NULL DEFAULT 'open' CHECK (betting_status IN ('open','closed','suspended','voided')),
  viewer_peak INT NOT NULL DEFAULT 0,
  viewer_total_seconds BIGINT NOT NULL DEFAULT 0,
  match_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  odds_home NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  odds_draw NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  odds_away NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  CONSTRAINT fk_matches_player1 FOREIGN KEY (player1_id) REFERENCES users(id),
  CONSTRAINT fk_matches_player2 FOREIGN KEY (player2_id) REFERENCES users(id),
  CONSTRAINT fk_matches_winner FOREIGN KEY (winner_id) REFERENCES users(id),
  CONSTRAINT fk_matches_referee FOREIGN KEY (referee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_results (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  submitted_by BIGINT NOT NULL,
  score1 INT NOT NULL,
  score2 INT NOT NULL,
  screenshot_url VARCHAR(1024),
  video_url VARCHAR(1024),
  stream_url VARCHAR(1024),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','confirmed','rejected','approved')),
  opponent_confirmed_at TIMESTAMP NULL,
  admin_approved_by BIGINT NULL,
  admin_approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_results_submitter FOREIGN KEY (submitted_by) REFERENCES users(id),
  CONSTRAINT fk_results_admin FOREIGN KEY (admin_approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS disputes (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  raised_by BIGINT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','rejected')),
  resolution TEXT NULL,
  resolved_by BIGINT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_disputes_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_disputes_raised_by FOREIGN KEY (raised_by) REFERENCES users(id),
  CONSTRAINT fk_disputes_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL,
  checkout_request_id VARCHAR(128),
  merchant_request_id VARCHAR(128),
  receipt_number VARCHAR(128),
  result_code VARCHAR(16),
  result_desc VARCHAR(255),
  phone VARCHAR(32),
  raw_callback JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mpesa_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT PRIMARY KEY,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallet_topups (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('manual','mpesa')),
  reference VARCHAR(128) NULL,
  sender_name VARCHAR(128) NULL,
  phone VARCHAR(32) NULL,
  receipt_url VARCHAR(1024) NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_topups_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_wallet_topups_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON wallet_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON wallet_topups(status);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit','debit')),
  reference_payment_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_tx_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_wallet_tx_payment FOREIGN KEY (reference_payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS bets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  match_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('home','draw','away')),
  odds NUMERIC(6,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','won','lost','void')),
  payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  settled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bets_match FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS streams (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','twitch','facebook')),
  url VARCHAR(1024) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_streams_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_streams_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS live_streams (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  stream_platform TEXT NOT NULL CHECK (stream_platform IN ('youtube','twitch','facebook')),
  stream_link VARCHAR(1024) NOT NULL,
  stream_platform_secondary TEXT NULL CHECK (stream_platform_secondary IN ('youtube','twitch','facebook')),
  stream_link_secondary VARCHAR(1024) NULL,
  stream_link_hd VARCHAR(1024) NULL,
  stream_link_sd VARCHAR(1024) NULL,
  stream_link_audio VARCHAR(1024) NULL,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public','registered','premium')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','live','ended','rejected')),
  notes TEXT NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by BIGINT NULL,
  approved_at TIMESTAMP NULL,
  CONSTRAINT fk_live_stream_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_live_stream_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_live_stream_approver FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('goal','red_card','yellow_card','penalty','kickoff','half_time','full_time','other')),
  side TEXT NOT NULL DEFAULT 'neutral' CHECK (side IN ('home','away','neutral')),
  minute INT NULL,
  description VARCHAR(255) NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_events_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_events_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_live_stats (
  match_id BIGINT PRIMARY KEY,
  possession_home INT NOT NULL DEFAULT 0,
  possession_away INT NOT NULL DEFAULT 0,
  shots_home INT NOT NULL DEFAULT 0,
  shots_away INT NOT NULL DEFAULT 0,
  passes_home INT NOT NULL DEFAULT 0,
  passes_away INT NOT NULL DEFAULT 0,
  fouls_home INT NOT NULL DEFAULT 0,
  fouls_away INT NOT NULL DEFAULT 0,
  yellow_home INT NOT NULL DEFAULT 0,
  yellow_away INT NOT NULL DEFAULT 0,
  red_home INT NOT NULL DEFAULT 0,
  red_away INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_live_stats_match FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS match_replays (
  match_id BIGINT PRIMARY KEY,
  replay_url VARCHAR(1024) NULL,
  highlights_url VARCHAR(1024) NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_replays_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_replays_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_chat_settings (
  match_id BIGINT PRIMARY KEY,
  enabled SMALLINT NOT NULL DEFAULT 1,
  slow_mode_seconds INT NOT NULL DEFAULT 0,
  updated_by BIGINT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_settings_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_chat_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  user_id BIGINT NULL,
  guest_name VARCHAR(64) NULL,
  guest_ip VARCHAR(64) NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by BIGINT NULL,
  CONSTRAINT fk_chat_messages_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_chat_messages_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_mutes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  ip VARCHAR(64) NULL,
  reason VARCHAR(255) NULL,
  expires_at TIMESTAMP NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_mutes_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_chat_mutes_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_viewers (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  viewer_id VARCHAR(64) NOT NULL,
  user_id BIGINT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (match_id, viewer_id),
  CONSTRAINT fk_match_viewers_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_viewers_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sponsors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  logo_url VARCHAR(1024) NULL,
  website_url VARCHAR(1024) NULL,
  position INT NOT NULL DEFAULT 0,
  active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS platform_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(128) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_by BIGINT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(32) NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','closed')),
  resolution TEXT NULL,
  resolved_by BIGINT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_support_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  payment_id BIGINT NULL,
  notes TEXT NULL,
  reviewed_by BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdraw_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_withdraw_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  CONSTRAINT fk_withdraw_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT NULL,
  ip VARCHAR(64),
  user_agent VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email','phone')),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verify_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS policy_documents (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(128) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'policy',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  updated_by BIGINT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_policies_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_verifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  id_type TEXT NOT NULL CHECK (id_type IN ('national_id','passport','drivers_license')),
  id_number VARCHAR(64) NOT NULL,
  country VARCHAR(64) NOT NULL,
  date_of_birth DATE NOT NULL,
  phone VARCHAR(32) NULL,
  document_url VARCHAR(1024) NULL,
  document_front_url VARCHAR(1024) NULL,
  document_back_url VARCHAR(1024) NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_verifications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (requester_id, receiver_id),
  CONSTRAINT fk_friends_requester FOREIGN KEY (requester_id) REFERENCES users(id),
  CONSTRAINT fk_friends_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL,
  following_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, following_id),
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id),
  CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_direct_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT fk_direct_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at);

CREATE TABLE IF NOT EXISTS activity_feed (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT NULL,
  verb VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id BIGINT NULL,
  target_user_id BIGINT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','friends','private')),
  payload JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT fk_activity_target FOREIGN KEY (target_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clubs (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  slug VARCHAR(128) UNIQUE NOT NULL,
  description TEXT NULL,
  logo_url VARCHAR(1024) NULL,
  region VARCHAR(64) NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clubs_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS club_members (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','manager','member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  joined_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (club_id, user_id),
  CONSTRAINT fk_club_members_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_club_members_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  icon_url VARCHAR(1024) NULL,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  achievement_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  awarded_by BIGINT NULL,
  awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_achievements_awarder FOREIGN KEY (awarded_by) REFERENCES users(id),
  UNIQUE (achievement_id, user_id)
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NULL,
  user_id BIGINT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  details JSONB NULL,
  resolved_at TIMESTAMP NULL,
  resolved_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fraud_alerts_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_fraud_alerts_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_fraud_alerts_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_match ON live_streams(match_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_match ON match_chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_mutes_user ON chat_mutes(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_mutes_ip ON chat_mutes(ip);
CREATE INDEX IF NOT EXISTS idx_match_viewers_match ON match_viewers(match_id);
CREATE INDEX IF NOT EXISTS idx_friends_receiver ON friends(receiver_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER match_live_stats_updated_at BEFORE UPDATE ON match_live_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER match_chat_settings_updated_at BEFORE UPDATE ON match_chat_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER policy_documents_updated_at BEFORE UPDATE ON policy_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER friends_updated_at BEFORE UPDATE ON friends FOR EACH ROW EXECUTE FUNCTION set_updated_at();

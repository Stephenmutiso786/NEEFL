CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('player','admin','supervisor','referee','fan','bettor','moderator','broadcaster') NOT NULL DEFAULT 'player',
  status ENUM('pending','active','banned') NOT NULL DEFAULT 'pending',
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  email_verified_at DATETIME NULL,
  phone_verified_at DATETIME NULL,
  date_of_birth DATE NULL,
  last_seen_at DATETIME NULL,
  privacy_profile ENUM('public','friends','private') NOT NULL DEFAULT 'public',
  privacy_presence TINYINT(1) NOT NULL DEFAULT 1,
  privacy_friend_requests TINYINT(1) NOT NULL DEFAULT 1,
  privacy_follow TINYINT(1) NOT NULL DEFAULT 1,
  kyc_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  kyc_verified_at DATETIME NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  user_id BIGINT UNSIGNED PRIMARY KEY,
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_players_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS seasons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft','active','completed') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_id BIGINT UNSIGNED NULL,
  name VARCHAR(128) NOT NULL,
  format ENUM('league','knockout','group','hybrid') NOT NULL,
  entry_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  prize_pool DECIMAL(12,2) NOT NULL DEFAULT 0,
  rules TEXT,
  start_date DATE,
  end_date DATE,
  status ENUM('draft','open','closed','ongoing','completed') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tournaments_season FOREIGN KEY (season_id) REFERENCES seasons(id),
  CONSTRAINT fk_tournaments_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'KES',
  type ENUM('entry_fee','prize_payout','wallet_topup','refund') NOT NULL,
  method ENUM('mpesa') NOT NULL DEFAULT 'mpesa',
  status ENUM('pending','paid','failed','reversed') NOT NULL DEFAULT 'pending',
  provider_ref VARCHAR(128) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','paid','approved','withdrawn') NOT NULL DEFAULT 'pending',
  payment_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_entry (tournament_id, player_id),
  CONSTRAINT fk_entries_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  CONSTRAINT fk_entries_player FOREIGN KEY (player_id) REFERENCES users(id),
  CONSTRAINT fk_entries_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT UNSIGNED NOT NULL,
  round VARCHAR(64),
  player1_id BIGINT UNSIGNED NOT NULL,
  player2_id BIGINT UNSIGNED NOT NULL,
  referee_id BIGINT UNSIGNED NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('scheduled','played','submitted','confirmed','disputed','forfeit','approved') NOT NULL DEFAULT 'scheduled',
  score1 INT NULL,
  score2 INT NULL,
  winner_id BIGINT UNSIGNED NULL,
  live_score1 INT NULL,
  live_score2 INT NULL,
  live_clock VARCHAR(16) NULL,
  live_status ENUM('ready','live','paused','ended','emergency') NOT NULL DEFAULT 'ready',
  live_phase ENUM('pre_match','first_half','half_time','second_half','extra_time','penalties','full_time') NOT NULL DEFAULT 'pre_match',
  live_timer_mode ENUM('manual','auto') NOT NULL DEFAULT 'manual',
  live_timer_started_at DATETIME NULL,
  live_timer_offset_seconds INT NOT NULL DEFAULT 0,
  betting_status ENUM('open','closed','suspended','voided') NOT NULL DEFAULT 'open',
  viewer_peak INT NOT NULL DEFAULT 0,
  viewer_total_seconds BIGINT NOT NULL DEFAULT 0,
  odds_home DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  odds_draw DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  odds_away DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  CONSTRAINT fk_matches_player1 FOREIGN KEY (player1_id) REFERENCES users(id),
  CONSTRAINT fk_matches_player2 FOREIGN KEY (player2_id) REFERENCES users(id),
  CONSTRAINT fk_matches_winner FOREIGN KEY (winner_id) REFERENCES users(id),
  CONSTRAINT fk_matches_referee FOREIGN KEY (referee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  submitted_by BIGINT UNSIGNED NOT NULL,
  score1 INT NOT NULL,
  score2 INT NOT NULL,
  screenshot_url VARCHAR(1024),
  video_url VARCHAR(1024),
  stream_url VARCHAR(1024),
  status ENUM('submitted','confirmed','rejected','approved') NOT NULL DEFAULT 'submitted',
  opponent_confirmed_at DATETIME NULL,
  admin_approved_by BIGINT UNSIGNED NULL,
  admin_approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_results_submitter FOREIGN KEY (submitted_by) REFERENCES users(id),
  CONSTRAINT fk_results_admin FOREIGN KEY (admin_approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS disputes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  raised_by BIGINT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('open','under_review','resolved','rejected') NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_disputes_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_disputes_raised_by FOREIGN KEY (raised_by) REFERENCES users(id),
  CONSTRAINT fk_disputes_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  checkout_request_id VARCHAR(128),
  merchant_request_id VARCHAR(128),
  receipt_number VARCHAR(128),
  result_code VARCHAR(16),
  result_desc VARCHAR(255),
  phone VARCHAR(32),
  raw_callback JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mpesa_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type ENUM('credit','debit') NOT NULL,
  reference_payment_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_tx_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_wallet_tx_payment FOREIGN KEY (reference_payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS bets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  match_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  choice ENUM('home','draw','away') NOT NULL,
  odds DECIMAL(6,2) NOT NULL,
  status ENUM('pending','won','lost','void') NOT NULL DEFAULT 'pending',
  payout DECIMAL(12,2) NOT NULL DEFAULT 0,
  settled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bets_match FOREIGN KEY (match_id) REFERENCES matches(id),
  INDEX idx_bets_user (user_id),
  INDEX idx_bets_match (match_id)
);

CREATE TABLE IF NOT EXISTS streams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('youtube','twitch','facebook') NOT NULL,
  url VARCHAR(1024) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_streams_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_streams_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS live_streams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  stream_platform ENUM('youtube','twitch','facebook') NOT NULL,
  stream_link VARCHAR(1024) NOT NULL,
  stream_link_hd VARCHAR(1024) NULL,
  stream_link_sd VARCHAR(1024) NULL,
  stream_link_audio VARCHAR(1024) NULL,
  access_level ENUM('public','registered','premium') NOT NULL DEFAULT 'public',
  status ENUM('pending','live','ended','rejected') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  CONSTRAINT fk_live_stream_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_live_stream_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_live_stream_approver FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_live_stream_match (match_id),
  INDEX idx_live_stream_status (status)
);

CREATE TABLE IF NOT EXISTS match_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('goal','red_card','yellow_card','penalty','kickoff','half_time','full_time','other') NOT NULL,
  side ENUM('home','away','neutral') NOT NULL DEFAULT 'neutral',
  minute INT NULL,
  description VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_events_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_events_user FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_match_events_match (match_id)
);

CREATE TABLE IF NOT EXISTS match_live_stats (
  match_id BIGINT UNSIGNED PRIMARY KEY,
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
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_live_stats_match FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS match_replays (
  match_id BIGINT UNSIGNED PRIMARY KEY,
  replay_url VARCHAR(1024) NULL,
  highlights_url VARCHAR(1024) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_replays_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_replays_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_chat_settings (
  match_id BIGINT UNSIGNED PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  slow_mode_seconds INT NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_settings_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_chat_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_chat_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  guest_name VARCHAR(64) NULL,
  guest_ip VARCHAR(64) NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  CONSTRAINT fk_chat_messages_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_chat_messages_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id),
  INDEX idx_chat_messages_match (match_id)
);

CREATE TABLE IF NOT EXISTS chat_mutes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  ip VARCHAR(64) NULL,
  reason VARCHAR(255) NULL,
  expires_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_mutes_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_chat_mutes_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_chat_mutes_user (user_id),
  INDEX idx_chat_mutes_ip (ip)
);

CREATE TABLE IF NOT EXISTS match_viewers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  viewer_id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_match_viewer (match_id, viewer_id),
  CONSTRAINT fk_match_viewers_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_viewers_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_match_viewers_match (match_id)
);

CREATE TABLE IF NOT EXISTS sponsors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  logo_url VARCHAR(1024) NULL,
  website_url VARCHAR(1024) NULL,
  position INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS platform_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(128) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(32) NULL,
  status ENUM('open','in_review','closed') NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_support_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  status ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  payment_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdraw_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_withdraw_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  CONSTRAINT fk_withdraw_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  ip VARCHAR(64),
  user_agent VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('email','phone') NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verify_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS policy_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(128) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'policy',
  body TEXT NOT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_policies_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_verifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  id_type ENUM('national_id','passport','drivers_license') NOT NULL,
  id_number VARCHAR(64) NOT NULL,
  country VARCHAR(64) NOT NULL,
  date_of_birth DATE NOT NULL,
  phone VARCHAR(32) NULL,
  document_url VARCHAR(1024) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_verifications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  UNIQUE KEY uniq_verification_user (user_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_friend_request (requester_id, receiver_id),
  CONSTRAINT fk_friends_requester FOREIGN KEY (requester_id) REFERENCES users(id),
  CONSTRAINT fk_friends_receiver FOREIGN KEY (receiver_id) REFERENCES users(id),
  INDEX idx_friends_receiver (receiver_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  follower_id BIGINT UNSIGNED NOT NULL,
  following_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_follow (follower_id, following_id),
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id),
  CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES users(id),
  INDEX idx_follows_following (following_id)
);

CREATE TABLE IF NOT EXISTS activity_feed (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NULL,
  verb VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id BIGINT UNSIGNED NULL,
  target_user_id BIGINT UNSIGNED NULL,
  visibility ENUM('public','friends','private') NOT NULL DEFAULT 'public',
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT fk_activity_target FOREIGN KEY (target_user_id) REFERENCES users(id),
  INDEX idx_activity_created (created_at)
);

CREATE TABLE IF NOT EXISTS clubs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  slug VARCHAR(128) UNIQUE NOT NULL,
  description TEXT NULL,
  logo_url VARCHAR(1024) NULL,
  region VARCHAR(64) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clubs_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS club_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner','manager','member') NOT NULL DEFAULT 'member',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  joined_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_club_member (club_id, user_id),
  CONSTRAINT fk_club_members_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_club_members_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  icon_url VARCHAR(1024) NULL,
  points INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  achievement_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  awarded_by BIGINT UNSIGNED NULL,
  awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_achievements_awarder FOREIGN KEY (awarded_by) REFERENCES users(id),
  UNIQUE KEY uniq_user_achievement (achievement_id, user_id)
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  details JSON NULL,
  resolved_at DATETIME NULL,
  resolved_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fraud_alerts_match FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_fraud_alerts_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_fraud_alerts_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
);

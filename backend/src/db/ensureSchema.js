import { db } from './index.js';

async function runSafe(statement, params) {
  try {
    await db.query(statement, params);
  } catch (err) {
    console.warn('Schema ensure failed:', err?.message || err);
  }
}

export async function ensureSchema() {
  await runSafe(`ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS document_front_url VARCHAR(1024) NULL`);
  await runSafe(`ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS document_back_url VARCHAR(1024) NULL`);

  await runSafe(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await runSafe(
    `ALTER TABLE users
     ADD CONSTRAINT users_role_check
     CHECK (role IN ('player','admin','director','supervisor','referee','coach','fan','bettor','moderator','broadcaster'))`
  );

  await runSafe(`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS stream_platform_secondary TEXT NULL`);
  await runSafe(`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS stream_link_secondary VARCHAR(1024) NULL`);

  await runSafe(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id BIGSERIAL PRIMARY KEY,
      sender_id BIGINT NOT NULL,
      receiver_id BIGINT NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_direct_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
      CONSTRAINT fk_direct_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id)`);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id)`);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at)`);

  await runSafe(`
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
    )
  `);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON wallet_topups(user_id)`);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON wallet_topups(status)`);

  const launchChecklistBody = [
    'FINAL Pre-Launch Checklist (eFootball Tournaments)',
    'Before launching your tournament system, use this checklist to run a professional event.',
    '',
    '1) System Readiness (Very Important)',
    '- Registration working (players can sign up)',
    '- Login works correctly',
    '- Match fixtures auto-generate or can be created',
    '- Results submission works',
    '- Standings/bracket updates automatically',
    '- Admin panel tested',
    '- Backup of database created',
    '',
    '2) Game Setup',
    '- Correct game version of eFootball installed',
    '- All consoles/PCs updated',
    '- Controllers working',
    '- Extra controllers available',
    '- Stable internet (if online play)',
    '- Game settings standardized (match time, difficulty, etc.)',
    '',
    'Recommended Match Settings',
    '- Match time: 6-10 minutes',
    '- Difficulty: Regular / Professional',
    '- Extra Time & Penalties: On (for knockouts)',
    '- Injuries: Off',
    '- Camera: Default',
    '',
    '3) Player Management',
    '- Player list finalized',
    '- Teams or clubs selection rules set',
    '- Player IDs verified',
    '- Substitute policy defined',
    '- Check-in system ready',
    '',
    '4) Tournament Structure',
    '- Format confirmed (Knockout / Groups / League)',
    '- Schedule published',
    '- Bracket ready',
    '- Match order planned',
    '- Time buffer between matches',
    '',
    '5) Rules & Fair Play',
    '- Official rules document published',
    '- Tie-breaker rules defined',
    '- Disconnection rules defined',
    '- Pause rules set',
    '- Unsportsmanlike conduct penalties',
    '',
    '6) Prize Pool & Payments',
    '- Prize pool confirmed',
    '- Distribution decided',
    '- Entry fee collected (if any)',
    '- Payment method ready (Cash / M-Pesa)',
    '- Receipt or confirmation system',
    '',
    '7) Communication',
    '- WhatsApp/Telegram group created',
    '- Contact person assigned',
    '- Announcements system ready',
    '- Match call-up method planned',
    '',
    '8) Venue & Logistics',
    '- Venue prepared',
    '- Enough screens/TVs',
    '- Seating for players and audience',
    '- Power supply + extension cables',
    '- Backup power',
    '- Cooling/ventilation',
    '',
    '9) Backup & Emergency Plan',
    '- Spare console/PC available',
    '- Extra controllers',
    '- Game backup copy',
    '- Manual score recording sheet',
    '- Internet backup (hotspot)',
    '',
    '10) Presentation & Professional Touch',
    '- Tournament name and branding',
    '- Poster/flyer ready',
    '- Opening announcement',
    '- Trophy or medals ready',
    '- Certificate templates',
    '',
    'Bonus Features (Makes the system feel pro)',
    '- Live leaderboard',
    '- Live stream option',
    '- Live chat during matches',
    '- AI match summaries',
    '- Mobile-friendly interface',
    '- Notifications system',
    '',
    'Final Go / No-Go',
    '- Can players register?',
    '- Can matches run smoothly?',
    '- Can winners be determined fairly?',
    '- Can prizes be delivered?',
    '',
    'Tournament Name & Branding',
    '- Choose a strong name (example ideas):',
    '- Mombasa eFootball Championship 2026',
    '- Coastal eFootball Cup',
    '- Ultimate eFootball Showdown',
    '- Pro Evolution Arena Cup',
    '- Swahili Coast eFootball Masters',
    '- Add a tagline:',
    '- "Where Legends Are Made"',
    '- "Battle for Glory"',
    '',
    'Poster / Flyer Content (Ready to Copy)',
    '- MOMBASA eFOOTBALL TOURNAMENT 2026',
    '- Date: __________',
    '- Time: __________',
    '- Venue: __________',
    '- Prize Pool: __________',
    '- Entry Fee: __________',
    '- Platform: PlayStation / PC',
    '- Players: __________',
    '- Register Now - Limited Slots!',
    '- Contact: __________',
    '- WhatsApp: __________',
    '',
    'Opening Announcement Script',
    '- "Welcome everyone to the Mombasa eFootball Championship 2026!',
    '- Today, the best players will compete for glory, pride, and the prize pool.',
    '- Please follow tournament rules, respect opponents, and most importantly - enjoy the game.',
    '- Let the tournament begin!"',
    '',
    'Trophy or Medals',
    '- Physical trophy (best choice)',
    '- Gold/Silver/Bronze medals',
    '- Gaming gear prizes',
    '- Cash prizes',
    '',
    'Certificate Template (Simple Version)',
    '- CERTIFICATE OF ACHIEVEMENT',
    '- This certifies that',
    '- ________________________',
    '- participated in the',
    '- MOMBASA eFOOTBALL TOURNAMENT 2026',
    '- Held on __________ at __________',
    '- Organizer: ______________________',
    '- Signature: ______________________',
    '- Date: ___________________________',
    '',
    'Fastest Pro Launch Tip',
    '- Print certificates',
    '- Buy one trophy',
    '- Make a digital poster',
    '- Use a simple name',
    '- Prepare an opening announcement'
  ].join('\n');

  await runSafe(
    `INSERT INTO policy_documents (slug, title, category, body, status)
     VALUES (:slug, :title, :category, :body, :status)
     ON CONFLICT (slug) DO NOTHING`,
    {
      slug: 'launch-checklist',
      title: 'Pre-Launch Checklist',
      category: 'operations',
      body: launchChecklistBody,
      status: 'published'
    }
  );
}

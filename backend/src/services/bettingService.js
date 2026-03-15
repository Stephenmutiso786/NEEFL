export function resolveOutcome(score1, score2) {
  if (score1 === null || score1 === undefined || score2 === null || score2 === undefined) {
    return null;
  }
  if (score1 > score2) return 'home';
  if (score2 > score1) return 'away';
  return 'draw';
}

export async function settleBetsForMatch(conn, { matchId, score1, score2 }) {
  const outcome = resolveOutcome(score1, score2);
  if (!outcome) {
    return { settled: 0 };
  }

  const [bets] = await conn.query(
    `SELECT id, user_id, amount, odds, choice
     FROM bets
     WHERE match_id = :match_id AND status = 'pending'
     FOR UPDATE`,
    { match_id: matchId }
  );

  let settled = 0;
  for (const bet of bets) {
    if (bet.choice === outcome) {
      const payout = Number(bet.amount) * Number(bet.odds);
      await conn.execute(
        `UPDATE bets
         SET status = 'won', payout = :payout, settled_at = NOW()
         WHERE id = :id`,
        { payout, id: bet.id }
      );
      await conn.execute(
        `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id`,
        { amount: payout, user_id: bet.user_id }
      );
      await conn.execute(
        `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
         VALUES (:user_id, :amount, 'credit', NULL)`,
        { user_id: bet.user_id, amount: payout }
      );
    } else {
      await conn.execute(
        `UPDATE bets
         SET status = 'lost', payout = 0, settled_at = NOW()
         WHERE id = :id`,
        { id: bet.id }
      );
    }
    settled += 1;
  }

  return { settled };
}

export async function voidBetsForMatch(conn, { matchId, reason = 'voided' }) {
  const [bets] = await conn.query(
    `SELECT id, user_id, amount
     FROM bets
     WHERE match_id = :match_id AND status = 'pending'
     FOR UPDATE`,
    { match_id: matchId }
  );

  let voided = 0;
  for (const bet of bets) {
    await conn.execute(
      `UPDATE bets
       SET status = 'void', payout = :amount, settled_at = NOW()
       WHERE id = :id`,
      { amount: bet.amount, id: bet.id }
    );
    await conn.execute(
      `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id`,
      { amount: bet.amount, user_id: bet.user_id }
    );
    await conn.execute(
      `INSERT INTO wallet_transactions (user_id, amount, type, reference_payment_id)
       VALUES (:user_id, :amount, 'credit', NULL)`,
      { user_id: bet.user_id, amount: bet.amount }
    );
    voided += 1;
  }

  return { voided, reason };
}

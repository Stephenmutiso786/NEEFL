export async function applyMatchStats(conn, match) {
  const { player1_id, player2_id, score1, score2 } = match;
  if (score1 === null || score2 === null) {
    return;
  }

  let p1Points = 0;
  let p2Points = 0;
  if (score1 > score2) {
    p1Points = 3;
  } else if (score2 > score1) {
    p2Points = 3;
  } else {
    p1Points = 1;
    p2Points = 1;
  }

  await conn.execute(
    `UPDATE players
     SET wins = wins + :wins,
         losses = losses + :losses,
         goals_scored = goals_scored + :goals,
         rank_points = rank_points + :points
     WHERE user_id = :user_id`,
    {
      wins: score1 > score2 ? 1 : 0,
      losses: score1 < score2 ? 1 : 0,
      goals: score1,
      points: p1Points,
      user_id: player1_id
    }
  );

  await conn.execute(
    `UPDATE players
     SET wins = wins + :wins,
         losses = losses + :losses,
         goals_scored = goals_scored + :goals,
         rank_points = rank_points + :points
     WHERE user_id = :user_id`,
    {
      wins: score2 > score1 ? 1 : 0,
      losses: score2 < score1 ? 1 : 0,
      goals: score2,
      points: p2Points,
      user_id: player2_id
    }
  );
}

import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function LeaderboardChart({ rows }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const labels = rows.slice(0, 8).map((row) => row.gamer_tag);
    const points = rows.slice(0, 8).map((row) => row.rank_points);

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ranking Points',
            data: points,
            backgroundColor: '#2ee6a6'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: '#cfe5d6' },
            grid: { display: false }
          },
          y: {
            ticks: { color: '#cfe5d6' },
            grid: { color: 'rgba(230, 255, 241, 0.12)' }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [rows]);

  return (
    <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
      <canvas ref={canvasRef} height="120"></canvas>
    </div>
  );
}

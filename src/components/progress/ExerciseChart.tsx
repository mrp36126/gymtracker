'use client';
import { useEffect, useRef } from 'react';

interface LogPoint {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
}

interface Props {
  logs: LogPoint[];
  mode: 'weight' | 'volume' | 'reps';
}

export default function ExerciseChart({ logs, mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || logs.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 44;
    const padR = 12;
    const padT = 16;
    const padB = 32;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    const values = logs.map(l =>
      mode === 'weight' ? l.weight :
      mode === 'volume' ? l.volume :
      l.reps
    );

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const padVal = range * 0.15;
    const yMin = Math.max(0, minVal - padVal);
    const yMax = maxVal + padVal;
    const yRange = yMax - yMin;

    const xStep = chartW / (logs.length - 1);

    const toX = (i: number) => padL + i * xStep;
    const toY = (v: number) => padT + chartH - ((v - yMin) / yRange) * chartH;

    // Grid lines
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (chartH / gridLines) * i;
      const val = yMax - (yRange / gridLines) * i;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        mode === 'volume' ? Math.round(val).toString() : Math.round(val) + (mode === 'weight' ? 'kg' : ''),
        padL - 6,
        y + 3
      );
    }

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, 'rgba(99,102,241,0.3)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < logs.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(values[i - 1]), cpx, toY(values[i]), toX(i), toY(values[i]));
    }
    ctx.lineTo(toX(logs.length - 1), padT + chartH);
    ctx.lineTo(toX(0), padT + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < logs.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(values[i - 1]), cpx, toY(values[i]), toX(i), toY(values[i]));
    }
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // PR point highlight
    const prVal = Math.max(...values);
    const prIdx = values.lastIndexOf(prVal);

    // Dots
    for (let i = 0; i < logs.length; i++) {
      const x = toX(i);
      const y = toY(values[i]);
      const isPR = i === prIdx;

      if (isPR) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245,158,11,0.2)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, isPR ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isPR ? '#F59E0B' : '#6366F1';
      ctx.fill();
      ctx.strokeStyle = '#0A0A0F';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // X axis dates — show first, middle, last only
    const dateIndices = [0, Math.floor((logs.length - 1) / 2), logs.length - 1];
    const shown = new Set<number>();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';

    for (const i of dateIndices) {
      if (shown.has(i)) continue;
      shown.add(i);
      const d = new Date(logs[i].date);
      const label = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      ctx.fillText(label, toX(i), H - 6);
    }

  }, [logs, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '180px', display: 'block' }}
    />
  );
}

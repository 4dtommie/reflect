<script lang="ts">
import { onMount } from 'svelte';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

export let data: { date: string; balance: number; type: 'history' | 'projection' }[] = [];
export let previousSalaryDate: string | null = null;
export let nextSalaryDate: string | null = null;
export let simulatedToday: string | null = null;

let chartCanvas: HTMLCanvasElement;
let chart: Chart | null = null;

function formatTickLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

onMount(() => {
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  // Split data into history (solid) and projection (dashed)
  const historyData = data.filter((d) => d.type === 'history').map((d) => ({ x: new Date(d.date).getTime(), y: d.balance }));
  const projectionData = data.filter((d) => d.type === 'projection').map((d) => ({ x: new Date(d.date).getTime(), y: d.balance }));
  
  // Add last history point to projection for seamless connection
  if (historyData.length > 0 && projectionData.length > 0) {
    projectionData.unshift(historyData[historyData.length - 1]);
  }

  // Calculate date boundaries
  const prevSalaryTs = previousSalaryDate ? new Date(previousSalaryDate).getTime() : null;
  const nextSalaryTs = nextSalaryDate ? new Date(nextSalaryDate).getTime() : null;
  // Use simulatedToday if provided (time machine), otherwise use actual today
  const todayTs = simulatedToday ? new Date(simulatedToday).setHours(0, 0, 0, 0) : new Date().setHours(0, 0, 0, 0);

  // X-axis min/max with 5-day padding for more margin
  const paddingDays = 5 * 24 * 60 * 60 * 1000;
  const allPoints = [...historyData, ...projectionData];
  const xMin = prevSalaryTs ? prevSalaryTs - paddingDays : (allPoints[0]?.x || todayTs) - paddingDays;
  const xMax = nextSalaryTs ? nextSalaryTs + paddingDays : (allPoints[allPoints.length - 1]?.x || todayTs) + paddingDays;

  // Build custom tick positions: previous salary, today, next salary
  const tickPositions: number[] = [];
  if (prevSalaryTs) tickPositions.push(prevSalaryTs);
  tickPositions.push(todayTs);
  if (nextSalaryTs) tickPositions.push(nextSalaryTs);

  // Plugin to draw vertical lines at tick positions
  const verticalLinesPlugin = {
    id: 'verticalLines',
    afterDraw(chart: any) {
      const { ctx, scales, chartArea } = chart;
      if (!scales.x || !chartArea) return;
      
      ctx.save();
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      for (const pos of tickPositions) {
        const x = scales.x.getPixelForValue(pos);
        if (x >= chartArea.left && x <= chartArea.right) {
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  chart = new Chart(ctx, {
    type: 'line',
    plugins: [verticalLinesPlugin],
    data: {
      datasets: [
        {
          label: 'History',
          data: historyData,
          borderColor: '#7c3aed',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#7c3aed',
          pointHitRadius: 20,
          tension: 0.2,
          fill: false
        },
        {
          label: 'Projection',
          data: projectionData,
          borderColor: '#7c3aed',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#7c3aed',
          pointHitRadius: 20,
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 12 },
          bodyFont: { size: 14, weight: 'bold' as const },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items: any[]) => {
              if (!items.length) return '';
              const ts = items[0].parsed.x as number;
              const date = new Date(ts);
              return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
            },
            label: (item: any) => {
              const value = item.parsed.y as number;
              return `€ ${value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          min: xMin,
          max: xMax,
          time: {
            unit: 'day'
          },
          grid: { display: false },
          border: { display: false },
          ticks: {
            source: 'labels',
            autoSkip: false,
            maxRotation: 0,
            color: '#374151',
            font: { size: 11 }
          },
          afterBuildTicks: function (axis) {
            axis.ticks = tickPositions.map(v => ({ value: v, label: '' }));
          },
          afterTickToLabelConversion: function (axis) {
            axis.ticks.forEach((tick, i) => {
              const pos = tickPositions[i];
              if (pos === todayTs) {
                tick.label = 'Vandaag';
              } else if (pos === prevSalaryTs) {
                tick.label = formatTickLabel(previousSalaryDate);
              } else if (pos === nextSalaryTs) {
                tick.label = formatTickLabel(nextSalaryDate);
              }
            });
          }
        },
        y: {
          display: false,
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });

  return () => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  };
});
</script>

<div class="h-full w-full">
  <canvas bind:this={chartCanvas}></canvas>
</div>

import * as pipelineService from './pipeline.service.js';

type SchedulerState = 'running' | 'stopped';

interface SchedulerConfig {
  marketHoursInterval: number;   // ms, default 7 min
  prePostInterval: number;       // ms, default 15 min
  quietInterval: number;         // ms, default 60 min
  weekendInterval: number;       // ms, default 120 min
}

const DEFAULT_CONFIG: SchedulerConfig = {
  marketHoursInterval: 7 * 60_000,
  prePostInterval: 15 * 60_000,
  quietInterval: 60 * 60_000,
  weekendInterval: 120 * 60_000,
};

let state: SchedulerState = 'stopped';
let timer: ReturnType<typeof setTimeout> | null = null;
let config = DEFAULT_CONFIG;

/** Start the smart scheduler */
export function startScheduler(overrides?: Partial<SchedulerConfig>): void {
  if (state === 'running') return;
  config = { ...DEFAULT_CONFIG, ...overrides };
  state = 'running';
  console.log('⏱️  Scheduler started');
  scheduleNext();
}

/** Stop the scheduler */
export function stopScheduler(): void {
  state = 'stopped';
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  console.log('⏱️  Scheduler stopped');
}

/** Get scheduler status */
export function getSchedulerStatus(): { state: SchedulerState; nextRunIn: number | null } {
  return { state, nextRunIn: timer ? getNextInterval() : null };
}

function scheduleNext(): void {
  if (state !== 'running') return;

  const interval = getNextInterval();
  timer = setTimeout(async () => {
    try {
      console.log(`⏱️  Pipeline triggered (interval: ${Math.round(interval / 60_000)}min)`);
      await pipelineService.runPipelineAll();
    } catch (err) {
      console.error('Pipeline run error:', err);
    }
    scheduleNext();
  }, interval);
}

/** Determine interval based on current time and market hours */
function getNextInterval(): number {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  // Weekend (Sat/Sun)
  if (day === 0 || day === 6) return config.weekendInterval;

  // Pre-market: 4:00 AM – 9:30 AM ET
  if (timeMinutes >= 240 && timeMinutes < 570) return config.prePostInterval;

  // Market hours: 9:30 AM – 4:00 PM ET
  if (timeMinutes >= 570 && timeMinutes < 960) return config.marketHoursInterval;

  // After hours: 4:00 PM – 8:00 PM ET
  if (timeMinutes >= 960 && timeMinutes < 1200) return config.prePostInterval;

  // Quiet hours: 8:00 PM – 4:00 AM ET
  return config.quietInterval;
}

import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { HighScore } from '../types';

const LS_SCORES_KEY = 'pm_unicorn_high_scores_list';
const LS_BEST_KEY = 'pm_unicorn_absolute_best';

// --- Rate limiting ---
// In-memory only: resets on page refresh, which is intentional.
// Purpose: prevent UI spam and casual scripted abuse within a session.
// Determined attackers who call the Firestore SDK directly bypass this;
// Firestore rules are the actual security boundary.
const RATE_MIN_INTERVAL_MS = 10_000;  // 10 s between submissions
const RATE_MAX_PER_HOUR    = 20;      // 20 submissions per rolling hour

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const _rate = {
  lastSubmitAt: 0,
  windowTimestamps: [] as number[],
};

function enforceRateLimit(): void {
  const now = Date.now();

  const msSinceLast = now - _rate.lastSubmitAt;
  if (_rate.lastSubmitAt > 0 && msSinceLast < RATE_MIN_INTERVAL_MS) {
    const waitSecs = Math.ceil((RATE_MIN_INTERVAL_MS - msSinceLast) / 1000);
    throw new RateLimitError(`Please wait ${waitSecs}s before submitting another score.`);
  }

  const oneHourAgo = now - 3_600_000;
  _rate.windowTimestamps = _rate.windowTimestamps.filter(t => t > oneHourAgo);
  if (_rate.windowTimestamps.length >= RATE_MAX_PER_HOUR) {
    throw new RateLimitError('Too many score submissions this hour. Please play a bit more!');
  }

  _rate.lastSubmitAt = now;
  _rate.windowTimestamps.push(now);
}

export const DEFAULT_SCORES: HighScore[] = [
  {
    id: 'df-1',
    name: 'Chief VP of Stasis',
    score: 1650,
    date: new Date(Date.now() - 360000000).toISOString(),
    level: 3,
    killedByAcronym: 'HIPPO',
    killedByName: "Highest Paid Person's Opinion"
  },
  {
    id: 'df-2',
    name: 'Framework Evangelist',
    score: 950,
    date: new Date(Date.now() - 180000000).toISOString(),
    level: 2,
    killedByAcronym: 'ZEBRA',
    killedByName: 'Zero Evidence But Really Arrogant'
  },
  {
    id: 'df-3',
    name: 'Junior PM Associate',
    score: 420,
    date: new Date(Date.now() - 86400000).toISOString(),
    level: 1,
    killedByAcronym: 'WOLF',
    killedByName: "Works on Latest Fire"
  }
];

function getLocalScores(): HighScore[] {
  const saved = localStorage.getItem(LS_SCORES_KEY);
  return saved ? JSON.parse(saved) : DEFAULT_SCORES;
}

export const scoreStore = {
  getBestScore(): number {
    const saved = localStorage.getItem(LS_BEST_KEY);
    return saved ? parseInt(saved, 10) : 0;
  },

  saveBestScore(score: number): void {
    localStorage.setItem(LS_BEST_KEY, score.toString());
  },

  subscribe(
    isOffline: boolean,
    onUpdate: (scores: HighScore[]) => void
  ): () => void {
    if (isOffline) {
      onUpdate(getLocalScores());
      return () => {};
    }

    const q = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const dbScores: HighScore[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Anonymous PM',
            score: Number(data.score) || 0,
            date: data.date
              ? (data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString())
              : new Date().toISOString(),
            level: Number(data.level) || 1,
            killedByAcronym: data.killedByAcronym || '',
            killedByName: data.killedByName || '',
          };
        });
        onUpdate(dbScores.length > 0 ? dbScores : getLocalScores());
      },
      (error) => {
        console.error('Firestore subscription error (falling back to local):', error);
        onUpdate(getLocalScores());
      }
    );
  },

  async submit(
    entry: {
      name: string;
      score: number;
      date: string;
      level: number;
      killedByAcronym: string;
      killedByName: string;
      userId?: string;
    },
    isOffline: boolean
  ): Promise<HighScore[]> {
    enforceRateLimit(); // throws RateLimitError if too frequent

    const newEntry: HighScore = {
      ...entry,
      id: `local-${Math.random().toString().replace('0.', '')}`,
    };

    const localList = [newEntry, ...getLocalScores()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    localStorage.setItem(LS_SCORES_KEY, JSON.stringify(localList));

    if (!isOffline) {
      const scoreDocId = entry.userId
        ? `score-${entry.userId}-${Date.now()}`
        : `score-anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      try {
        await setDoc(doc(db, 'scores', scoreDocId), {
          name: entry.name.slice(0, 30),
          score: Math.floor(entry.score),
          date: serverTimestamp(),
          level: Math.floor(entry.level),
          killedByAcronym: entry.killedByAcronym,
          killedByName: entry.killedByName,
          userId: entry.userId ?? 'anonymous',
        });
      } catch (error) {
        // Local backup already written above — log and continue gracefully
        console.error(`Firestore score write failed (${scoreDocId}):`, error instanceof Error ? error.message : String(error));
      }
    }

    return localList;
  },

  clear(): void {
    localStorage.removeItem(LS_SCORES_KEY);
    localStorage.removeItem(LS_BEST_KEY);
  },
};

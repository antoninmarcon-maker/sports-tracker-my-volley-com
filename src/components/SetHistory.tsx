import { SetData, SportType, getScoredActionsForSport, getFaultActionsForSport } from '@/types/sports';
import { ChevronDown, ChevronUp, Trophy, Clock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SetHistoryProps {
  completedSets: SetData[];
  currentSetNumber: number;
  setsScore: { blue: number; red: number };
  teamNames: { blue: string; red: string };
  isFinished?: boolean;
  sport?: SportType;
  selectedSetIndex?: number;
  onSelectSet?: (index: number) => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

export function SetHistory({ completedSets, currentSetNumber, setsScore, teamNames, isFinished = false, sport = 'volleyball', selectedSetIndex, onSelectSet }: SetHistoryProps) {
  const { t } = useTranslation();
  const periodLabel = sport === 'basketball' ? 'QT' : 'SET';
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  if (completedSets.length === 0 && currentSetNumber === 1) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sport === 'basketball' ? t('setHistory.quarters') : t('setHistory.sets')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-team-blue">{setsScore.blue}</span>
          <span className="text-xs text-muted-foreground">-</span>
          <span className="text-sm font-black text-team-red">{setsScore.red}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isFinished
            ? (setsScore.blue > setsScore.red
              ? `🏆 ${teamNames.blue}`
              : setsScore.red > setsScore.blue
                ? `🏆 ${teamNames.red}`
                : t('setHistory.equality'))
            : t('setHistory.inProgress', { period: periodLabel, number: currentSetNumber })}
        </span>
      </div>

      {completedSets.map((set, index) => {
        const isSelected = selectedSetIndex === index;
        return (
          <div key={set.id} className={`bg-card rounded-xl border overflow-hidden ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
            <button
              onClick={() => {
                if (onSelectSet) onSelectSet(index);
                setExpandedSet(expandedSet === set.id ? null : set.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{periodLabel} {set.number}</span>
                <div className={`w-2 h-2 rounded-full ${set.winner === 'blue' ? 'bg-team-blue' : 'bg-team-red'}`} />
                {set.duration > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock size={10} /> {formatDuration(set.duration)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${set.winner === 'blue' ? 'text-team-blue' : 'text-muted-foreground'}`}>
                  {set.score.blue}
                </span>
                <span className="text-xs text-muted-foreground">-</span>
                <span className={`text-sm font-bold ${set.winner === 'red' ? 'text-team-red' : 'text-muted-foreground'}`}>
                  {set.score.red}
                </span>
                {expandedSet === set.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </div>
            </button>
            {expandedSet === set.id && (
              <div className="px-3 pb-3 border-t border-border pt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-team-blue font-semibold mb-1">{teamNames.blue}</p>
                    <p className="text-muted-foreground">{t('setHistory.scored')}: {set.points.filter(p => p.team === 'blue' && p.type === 'scored').length}</p>
                    <p className="text-muted-foreground">{t('setHistory.faults')}: {set.points.filter(p => p.team === 'blue' && p.type === 'fault').length}</p>
                    {(() => {
                      const bluePoints = set.points.filter(p => p.team === 'blue');
                      const allActions = [...getScoredActionsForSport(sport), ...getFaultActionsForSport(sport)];
                      const actionCounts = allActions
                        .map(a => ({ label: a.label, count: bluePoints.filter(p => p.action === a.key).length }))
                        .filter(a => a.count > 0);
                      if (actionCounts.length === 0) return null;
                      return (
                        <div className="mt-1.5 space-y-0.5">
                          {actionCounts.map(a => (
                            <p key={a.label} className="text-muted-foreground/70 pl-2 border-l border-border">{a.label}: {a.count}</p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-team-red font-semibold mb-1">{teamNames.red}</p>
                    <p className="text-muted-foreground">{t('setHistory.scored')}: {set.points.filter(p => p.team === 'red' && p.type === 'scored').length}</p>
                    <p className="text-muted-foreground">{t('setHistory.faults')}: {set.points.filter(p => p.team === 'red' && p.type === 'fault').length}</p>
                    {(() => {
                      const redPoints = set.points.filter(p => p.team === 'red');
                      const allActions = [...getScoredActionsForSport(sport), ...getFaultActionsForSport(sport)];
                      const actionCounts = allActions
                        .map(a => ({ label: a.label, count: redPoints.filter(p => p.action === a.key).length }))
                        .filter(a => a.count > 0);
                      if (actionCounts.length === 0) return null;
                      return (
                        <div className="mt-1.5 space-y-0.5">
                          {actionCounts.map(a => (
                            <p key={a.label} className="text-muted-foreground/70 pl-2 border-l border-border">{a.label}: {a.count}</p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

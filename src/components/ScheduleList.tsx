import React from 'react';
import { Match } from '../types';
import { MatchCard } from './MatchCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface ScheduleListProps {
  matches: Match[];
  sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  isCompact?: boolean;
}

export const ScheduleList = ({ matches, sectionRefs, isCompact = false }: ScheduleListProps) => {
  // Group matches by date in Beijing Time
  const groupedMatches = matches.reduce((groups, match) => {
    const date = new Date(match.startTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(match);
    return groups;
  }, {} as Record<string, Match[]>);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long',
      timeZone: 'Asia/Shanghai'
    });
  };

  return (
    <div className="space-y-10">
      <AnimatePresence mode="popLayout">
        {Object.entries(groupedMatches)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, dayMatches]) => (
            <div 
            key={date} 
            id={`section-${date}`}
            ref={(el) => (sectionRefs.current[date] = el)}
            className={cn(
              "scroll-mt-[140px]",
              isCompact ? "space-y-2" : "space-y-4"
            )}
          >
            <div className="flex items-center gap-3 py-2">
              <h2 className="text-sm font-bold text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full">
                {formatDateLabel(date)}
              </h2>
              <div className="h-[1px] flex-1 bg-zinc-200" />
            </div>
            
            <div className={cn(
              "grid",
              isCompact ? "grid-cols-1 gap-1.5" : "grid-cols-1 sm:grid-cols-2 gap-4"
            )}>
              {dayMatches.map((match) => (
                <MatchCard key={match.id} match={match} isCompact={isCompact} />
              ))}
            </div>
          </div>
        ))}
      </AnimatePresence>
      
      {matches.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 text-center"
        >
          <p className="text-zinc-400 font-sans text-sm">暂无比赛安排</p>
        </motion.div>
      )}
    </div>
  );
};


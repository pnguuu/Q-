import React from 'react';
import { Match } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface MatchCardProps {
  match: Match;
  isCompact?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = React.memo(({ 
  match, 
  isCompact = false, 
  isFavorite = false, 
  onToggleFavorite 
}) => {
  const startTime = new Date(match.startTime);
  const timeString = startTime.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: 'Asia/Shanghai' 
  });
  
  const statusColor = {
    '待开始': 'text-zinc-400',
    '进行中': 'text-red-500 font-bold',
    '已结束': 'text-zinc-500'
  }[match.status];

  if (isCompact) {
    return (
      <div className="w-full">
        <div className={cn(
          "bg-white border rounded-lg shadow-sm hover:shadow-md transition-all py-2 px-4 flex flex-row items-center w-full min-h-[44px] relative group",
          isFavorite ? "border-amber-200 bg-amber-50/30" : "border-zinc-100"
        )}>
          {/* Team A - Left side, pushed towards center */}
          <div className="flex-1 text-right pr-4 min-w-0">
            <span className="text-sm font-bold text-zinc-900 truncate block">
              {match.teamA.shortName}
            </span>
          </div>

          {/* Center Info - Time/Score & Region */}
          <div className="flex flex-col items-center justify-center px-4 shrink-0 border-x border-zinc-50 min-w-[90px]">
            <span className={cn(
              "text-[13px] font-mono font-bold leading-none",
              (match.status === '进行中' || match.status === '已结束') ? "text-blue-600" : "text-zinc-900"
            )}>
              {(match.status === '进行中' || match.status === '已结束') 
                ? `${match.scoreA} : ${match.scoreB}` 
                : timeString
              }
            </span>
            {match.category === 'primary' && (
              <span className="text-[8px] text-zinc-400 font-mono uppercase tracking-widest mt-1">
                {match.region}
              </span>
            )}
          </div>

          {/* Team B - Right side, pushed towards center */}
          <div className="flex-1 text-left pl-4 min-w-0">
            <span className="text-sm font-bold text-zinc-900 truncate block">
              {match.teamB.shortName}
            </span>
          </div>

          {/* Star Button - Compact */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(match.id);
            }}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
              isFavorite ? "text-amber-500 opacity-100" : "text-zinc-300 opacity-0 group-hover:opacity-100 hover:bg-zinc-100"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Card className={cn(
        "bg-white transition-all p-3 flex flex-col gap-3 relative overflow-hidden border",
        isFavorite ? "border-amber-200 bg-amber-50/30 shadow-amber-100 shadow-md" : "border-zinc-100 shadow-sm hover:shadow-md"
      )}>
        {/* Top: League Name & Region/Format */}
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-medium text-zinc-500 truncate max-w-[70%]">
            {match.league}
          </span>
          <div className="flex gap-1.5 items-center">
            {match.category === 'primary' && (
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-none text-[9px] px-1.5 py-0 h-4">
                {match.region}
              </Badge>
            )}
            <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-[9px] px-1.5 py-0 h-4">
              {match.format}
            </Badge>
          </div>
        </div>

        {/* Middle: Teams & Time */}
        <div className="flex items-center justify-between px-2">
          {/* Team A */}
          <div className="flex flex-col items-center gap-1 w-20">
            <img 
              src={match.teamA.logo} 
              alt={match.teamA.name} 
              className="w-12 h-12 object-contain bg-zinc-50 p-1 border border-zinc-100 rounded-sm"
              referrerPolicy="no-referrer"
            />
            <span className="text-[11px] font-bold text-zinc-800 truncate w-full text-center">
              {match.teamA.shortName}
            </span>
          </div>

          {/* Time or Score */}
          <div className="flex flex-col items-center">
            <span className={cn(
              "text-xl font-mono font-bold tracking-tight",
              (match.status === '进行中' || match.status === '已结束') ? "text-blue-600" : "text-zinc-900"
            )}>
              {(match.status === '进行中' || match.status === '已结束') 
                ? `${match.scoreA} : ${match.scoreB}` 
                : timeString
              }
            </span>
            <div className="h-[1px] w-8 bg-zinc-200 my-0.5" />
            <span className="text-[9px] text-zinc-400 font-mono uppercase">
              {match.status === '待开始' ? 'MATCH' : 'SCORE'}
            </span>
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center gap-1 w-20">
            <img 
              src={match.teamB.logo} 
              alt={match.teamB.name} 
              className="w-12 h-12 object-contain bg-zinc-50 p-1 border border-zinc-100 rounded-sm"
              referrerPolicy="no-referrer"
            />
            <span className="text-[11px] font-bold text-zinc-800 truncate w-full text-center">
              {match.teamB.shortName}
            </span>
          </div>
        </div>

        {/* Bottom: Status & Star */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            {match.status === '进行中' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
            <span className={`text-[10px] uppercase tracking-wider ${statusColor}`}>
              {match.status}
            </span>
          </div>

          {/* Star Button - Detailed */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(match.id);
            }}
            className={cn(
              "p-1.5 rounded-full transition-all",
              isFavorite ? "text-amber-500" : "text-zinc-300 hover:text-zinc-400 hover:bg-zinc-100"
            )}
          >
            <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
          </button>
        </div>
      </Card>
    </div>
  );
});

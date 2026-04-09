import { useState, useMemo, useRef, useEffect } from 'react';
import { fetchMatches } from './services/pandaScore';
import { Match } from './types';
import { ScheduleList } from './components/ScheduleList';
import { Trophy, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Loader2, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  setYear,
  setMonth
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper to get YYYY-MM-DD in Beijing time
const getBeijingDateStr = (date: Date) => {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
};

const getDynamicDates = (matches: Match[]) => {
  if (matches.length === 0) {
    // Fallback to 30 days around today if no matches
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const dates = [];
    for (let i = -30; i < 30; i++) {
      dates.push(addDays(now, i));
    }
    return dates;
  }

  // Find earliest and latest match dates
  const startTimes = matches.map(m => new Date(m.startTime).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...startTimes);

  const startDate = new Date(new Date(minTime).toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const endDate = new Date(new Date(maxTime).toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));

  // Ensure today is included in the range
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const finalStart = startDate < now ? startDate : now;
  const finalEnd = endDate > now ? endDate : now;

  console.log('[DATES] Range:', getBeijingDateStr(finalStart), 'to', getBeijingDateStr(finalEnd));

  return eachDayOfInterval({
    start: finalStart,
    end: finalEnd
  });
};

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const days = useMemo(() => getDynamicDates(matches), [matches]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorType(null);
      try {
        const response = await fetchMatches();
        console.log('App received response:', response);
        setMatches(response.matches);
        setLastUpdated(response.lastUpdated);

        // --- 自动定位逻辑 ---
        if (response.matches.length > 0) {
          const now = new Date();
          const todayStr = getBeijingDateStr(now);
          
          // 1. 检查今天是否有比赛
          const hasToday = response.matches.some(m => getBeijingDateStr(new Date(m.startTime)) === todayStr);
          
          if (hasToday) {
            setSelectedDate(now);
            // 延迟滚动以确保 DOM 已渲染
            setTimeout(() => scrollToDate(now), 100);
          } else {
            // 2. 寻找最近的未来比赛
            const futureMatch = response.matches.find(m => new Date(m.startTime) > now);
            if (futureMatch) {
              const futureDate = new Date(futureMatch.startTime);
              setSelectedDate(futureDate);
              setTimeout(() => scrollToDate(futureDate), 100);
            } else {
              // 3. 寻找最近的过去比赛
              const pastMatches = [...response.matches].reverse();
              const lastMatch = pastMatches.find(m => new Date(m.startTime) < now);
              if (lastMatch) {
                const pastDate = new Date(lastMatch.startTime);
                setSelectedDate(pastDate);
                setTimeout(() => scrollToDate(pastDate), 100);
              }
            }
          }
        }
      } catch (error) {
        console.error('Load data error:', error);
        setErrorType(error instanceof Error ? error.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Scroll to selected date in the horizontal bar
  useEffect(() => {
    const dateStr = getBeijingDateStr(selectedDate);
    const selectedEl = document.getElementById(`date-${dateStr}`);
    if (selectedEl && scrollContainerRef.current) {
      selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDate]);

  const scrollToDate = (date: Date, fromCalendar = false) => {
    setSelectedDate(date);
    const targetDateStr = getBeijingDateStr(date);
    
    const performScroll = () => {
      // Ensure we have the latest refs
      const availableDates = Object.keys(sectionRefs.current)
        .filter(d => sectionRefs.current[d])
        .sort();

      let scrollDateStr = availableDates.find(d => d >= targetDateStr);
      if (!scrollDateStr && availableDates.length > 0) {
        scrollDateStr = availableDates[availableDates.length - 1];
      }

      if (scrollDateStr) {
        const element = sectionRefs.current[scrollDateStr] || document.getElementById(`section-${scrollDateStr}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    if (fromCalendar) {
      setIsCalendarOpen(false);
    }

    // Use a small timeout to ensure state updates and potential re-renders are handled
    setTimeout(performScroll, fromCalendar ? 100 : 10);
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const years = useMemo(() => {
    if (days.length === 0) return [2026];
    const startYear = days[0].getFullYear();
    const endYear = days[days.length - 1].getFullYear();
    const yearList = [];
    for (let y = startYear; y <= endYear; y++) {
      yearList.push(y);
    }
    return yearList;
  }, [days]);

  const months = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-zinc-200 selection:text-zinc-900">
      {/* Initial Loading Overlay */}
      <AnimatePresence>
        {loading && matches.length === 0 && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-bold tracking-tight">赛程聚合</h2>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-1">
                正在同步实时赛程数据...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold tracking-tight">赛程聚合</h1>
            </div>
            {lastUpdated && (
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest ml-7 leading-none mt-0.5">
                更新于: {format(new Date(lastUpdated), 'HH:mm:ss', { locale: zhCN })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsCompactView(!isCompactView)}
              className={cn(
                "p-2 rounded-full transition-all border",
                isCompactView 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
              )}
              title={isCompactView ? "切换到详细视图" : "切换到简洁视图"}
            >
              {isCompactView ? <LayoutGrid className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={cn(
                "p-2 rounded-full transition-all border",
                isCalendarOpen 
                  ? "bg-blue-50 text-blue-600 border-blue-100" 
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
              )}
            >
              {isCalendarOpen ? <X className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Horizontal Date Bar */}
        <div className="bg-white border-b border-zinc-100 overflow-hidden">
          <div className="max-w-3xl mx-auto">
            <div 
              ref={scrollContainerRef}
              className="flex overflow-x-auto no-scrollbar py-2 px-4 gap-2 scroll-smooth"
            >
              {days.map((date) => {
                const dateStr = getBeijingDateStr(date);
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <button
                    key={dateStr}
                    id={`date-${dateStr}`}
                    onClick={() => scrollToDate(date)}
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[56px] py-2 rounded-xl transition-all shrink-0",
                      isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                    )}
                  >
                    <span className="text-[9px] font-medium opacity-80 uppercase">
                      {format(date, 'EEE', { locale: zhCN })}
                    </span>
                    <span className="text-sm font-bold">
                      {format(date, 'M.d')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Full Screen Calendar Overlay */}
      <AnimatePresence>
        {isCalendarOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-14"
          >
            <div className="max-w-3xl mx-auto h-full flex flex-col p-4">
              {/* Calendar Navigation Controls */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-zinc-900">
                  {format(currentMonth, 'yyyy年 MMMM', { locale: zhCN })}
                </h3>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 mb-4">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-zinc-400 uppercase py-2">{d}</div>
                  ))}
                </div>
                <motion.div 
                  key={currentMonth.toISOString()}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-7 gap-1"
                >
                  {calendarDays.map((date, i) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          scrollToDate(date, true);
                        }}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative",
                          !isCurrentMonth && "opacity-20",
                          isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "hover:bg-zinc-50"
                        )}
                      >
                        <span className="text-sm font-bold">{format(date, 'd')}</span>
                        {isSameDay(date, new Date()) && !isSelected && (
                          <div className="absolute bottom-2 w-1 h-1 bg-blue-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </div>

              <div className="py-6 border-t border-zinc-100 mt-auto space-y-4">
                {/* Year/Month/Day Manual Picker UI */}
                <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">快速跳转日期</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select 
                        value={currentMonth.getFullYear().toString()} 
                        onValueChange={(v) => setCurrentMonth(setYear(currentMonth, parseInt(v)))}
                      >
                        <SelectTrigger className="w-full h-9 bg-white border-zinc-200 rounded-lg font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Select 
                        value={(currentMonth.getMonth() + 1).toString()} 
                        onValueChange={(v) => setCurrentMonth(setMonth(currentMonth, parseInt(v) - 1))}
                      >
                        <SelectTrigger className="w-full h-9 bg-white border-zinc-200 rounded-lg font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {months.map((m, i) => (
                            <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Select 
                        value={selectedDate.getDate().toString()} 
                        onValueChange={(v) => {
                          const newDate = new Date(currentMonth);
                          newDate.setDate(parseInt(v));
                          scrollToDate(newDate, true);
                        }}
                      >
                        <SelectTrigger className="w-full h-9 bg-white border-zinc-200 rounded-lg font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <SelectItem key={d} value={d.toString()}>{d}日</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    scrollToDate(new Date(), true);
                  }}
                  className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  回到今天
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-mono text-zinc-400 uppercase tracking-widest">正在加载实时赛程...</p>
          </div>
        ) : errorType ? (
          <div className="py-20 text-center">
            <p className="text-red-500 font-sans text-sm font-bold">获取赛程失败</p>
            <p className="text-zinc-400 text-xs mt-2">{errorType}</p>
          </div>
        ) : (
          <ScheduleList 
            matches={matches} 
            sectionRefs={sectionRefs}
            isCompact={isCompactView}
          />
        )}
      </main>

      {/* Mobile Nav Placeholder */}
      <div className="h-20" />
    </div>
  );
}

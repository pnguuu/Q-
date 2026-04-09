export type Region = 'LPL' | 'LCK' | 'LEC' | 'VCT CN' | 'VCT PAC' | 'VCT EMEA';

export interface Team {
  name: string;
  logo: string;
  shortName: string;
}

export type MatchStatus = '待开始' | '进行中' | '已结束';
export type MatchFormat = 'BO1' | 'BO3' | 'BO5';

export type MatchCategory = 'primary' | 'international' | 'cn_extended' | 'candidate_extended';

export interface Match {
  id: string;
  startTime: string; // ISO string
  region: Region;
  teamA: Team;
  teamB: Team;
  scoreA?: number;
  scoreB?: number;
  status: MatchStatus;
  league: string;
  format: MatchFormat;
  category: MatchCategory;
}

export interface ApiResponse {
  matches: Match[];
  lastUpdated: string;
  source: string;
}

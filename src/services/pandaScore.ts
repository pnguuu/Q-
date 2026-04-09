import { Match, Region, MatchStatus, MatchFormat, ApiResponse, MatchCategory } from '../types';

// --- 战队白名单配置 ---
const LOL_LPL_TEAM_WHITELIST = [
  { key: "AL", names: ["Anyone's Legend", "ANYONE'S LEGEND", "AL"] },
  { key: "BLG", names: ["Bilibili Gaming", "BILIBILI GAMING", "BLG"] },
  { key: "EDG", names: ["EDward Gaming", "EDWARD GAMING", "EDG"] },
  { key: "IG", names: ["Invictus Gaming", "INVICTUS GAMING", "IG", "iG"] },
  { key: "JDG", names: ["JDG", "JDG Esports", "Beijing JDG Esports", "BEIJING JDG ESPORTS"] },
  { key: "LGD", names: ["LGD Gaming", "LGD GAMING", "LGD"] },
  { key: "LNG", names: ["LNG Esports", "Suzhou LNG Esports", "SUZHOU LNG ESPORTS", "LNG"] },
  { key: "NIP", names: ["Ninjas in Pyjamas", "Shenzhen Ninjas in Pyjamas", "SHENZHEN NINJAS IN PYJAMAS", "Ninjas in Pyjamas.CN", "NIP"] },
  { key: "OMG", names: ["Oh My God", "OH MY GOD", "OMG"] },
  { key: "TES", names: ["Top Esports", "TOP ESPORTS", "TES"] },
  { key: "TT", names: ["ThunderTalk Gaming", "THUNDERTALK GAMING", "THUNDER TALK GAMING", "TT"] },
  { key: "UP", names: ["Ultra Prime", "ULTRA PRIME", "UP"] },
  { key: "WE", names: ["Team WE", "Xi'an Team WE", "XI'AN TEAM WE", "WE"] },
  { key: "WBG", names: ["Weibo Gaming", "WeiboGaming", "WEIBO GAMING", "WEIBOGAMING", "WBG"] }
];

const VALORANT_VCT_CN_TEAM_WHITELIST = [
  { key: "AG", names: ["All Gamers", "ALL GAMERS", "AG"] },
  { key: "BLG", names: ["Bilibili Gaming", "BILIBILI GAMING", "BLG"] },
  { key: "DRG", names: ["Dragon Ranger Gaming", "DRAGON RANGER GAMING", "DRG"] },
  { key: "EDG", names: ["EDward Gaming", "EDWARD GAMING", "EDG"] },
  { key: "FPX", names: ["FunPlus Phoenix", "FUNPLUS PHOENIX", "FPX"] },
  { key: "JDG", names: ["JDG", "JDG Esports", "JDG ESPORTS"] },
  { key: "NOVA", names: ["Nova Esports", "NOVA ESPORTS", "NOVA"] },
  { key: "TEC", names: ["Titan Esports Club", "TITAN ESPORTS CLUB", "TEC"] },
  { key: "TE", names: ["Trace Esports", "TRACE ESPORTS", "TE"] },
  { key: "TYL", names: ["TYLOO", "TYLOO Gaming", "TYLOO GAMING", "TYL"] },
  { key: "WOL", names: ["Wolves Esports", "WOLVES ESPORTS", "WOL"] },
  { key: "XLG", names: ["Xi Lai Gaming", "XI LAI GAMING", "XLG"] }
];

// 需要排除的次级赛事/非顶级赛事关键字 (全大写匹配)
const EXCLUDE_KEYWORDS = [
  'EMEA MASTERS',
  'HITPOINT MASTERS',
  'TCL MASTERS',
  'ARABIAN LEAGUE',
  'REGIONAL LEAGUE',
  'LPLOL',
  'ACADEMY',
  'YOUTH',
  'CHALLENGERS',
  'GAME CHANGERS',
  'ASCENSION',
  'SECONDARY',
  'OPEN QUALIFIER',
  'CLOSED QUALIFIER',
  'OFF-SEASON',
  'VCL',
  'PROMOTION',
  'CONTENDERS',
  'QUALIFIER'
];

// 国际赛事精确白名单 (LoL 专用)
const LOL_INTL_WHITELIST = [
  'FIRST STAND',
  'MSI',
  'MID-SEASON INVITATIONAL',
  'WORLD CHAMPIONSHIP',
  'WORLDS',
  'EWC',
  'ESPORTS WORLD CUP'
];

// Valorant 官方大师赛城市白名单
const VAL_MASTERS_CITIES = [
  'BANGKOK',
  'TORONTO',
  'MADRID',
  'SHANGHAI',
  'TOKYO',
  'REYKJAVIK',
  'COPENHAGEN',
  'BERLIN',
  'SANTIAGO'
];

// Valorant 国际赛事官方短语
const VAL_INTL_PHRASES = [
  'VALORANT MASTERS',
  'VCT MASTERS',
  'VALORANT CHAMPIONS',
  'VCT CHAMPIONS',
  'CHAMPIONS TOUR'
];

const mapStatus = (status: string): MatchStatus => {
  switch (status) {
    case 'running': return '进行中';
    case 'finished': return '已结束';
    default: return '待开始';
  }
};

const mapFormat = (numberOfGames: number): MatchFormat => {
  if (numberOfGames === 1) return 'BO1';
  if (numberOfGames === 3) return 'BO3';
  if (numberOfGames === 5) return 'BO5';
  return 'BO3';
};

// --- 辅助判断函数 (Valorant 专用) ---
const isPrimaryValorantLeague = (m: any, allFields: string[]): boolean => {
  if (m.videogame?.slug !== 'valorant') return false;
  const combined = allFields.join(' ');
  const hasSystem = combined.includes('VCT') || combined.includes('CHAMPIONS TOUR');
  const hasRegion = combined.includes('CN') || combined.includes('CHINA') || 
                    combined.includes('PACIFIC') || combined.includes('PAC') || 
                    combined.includes('EMEA');
  return hasSystem && hasRegion;
};

const isInternationalValorantEvent = (m: any, allFields: string[]): boolean => {
  if (m.videogame?.slug !== 'valorant') return false;
  const combined = allFields.join(' ');
  
  // 1. 严格黑名单排除
  const blacklist = [
    'EMEA MASTERS', 'HITPOINT MASTERS', 'TCL MASTERS', 
    'ACADEMY', 'YOUTH', 'CHALLENGERS', 'GAME CHANGERS', 
    'ASCENSION', 'SECONDARY', 'REGIONAL LEAGUE', 'VCL'
  ];
  if (blacklist.some(kw => combined.includes(kw))) return false;

  // 2. 官方城市名优先识别
  const cities = ['SANTIAGO', 'BANGKOK', 'TORONTO'];
  if (cities.some(city => combined.includes(city) && combined.includes('MASTERS'))) {
    return true;
  }

  // 3. 官方短语识别
  const phrases = [
    'VALORANT MASTERS', 'VCT MASTERS', 'MASTERS',
    'VALORANT CHAMPIONS', 'VCT CHAMPIONS', 'CHAMPIONS'
  ];
  
  return phrases.some(phrase => combined.includes(phrase));
};

const isExtendedCnValorantEvent = (m: any, allFields: string[]): boolean => {
  if (m.videogame?.slug !== 'valorant') return false;
  const combined = allFields.join(' ');
  
  // 1. 关键词命中
  const keywords = [
    '进化者', 'EVOLUTION', '中国赛区', 
    'CHINA QUALIFIER', 'CN QUALIFIER', 'EWC QUALIFIER',
    'ACL', 'SOOP'
  ];
  if (keywords.some(kw => combined.includes(kw))) return true;

  // 2. 队伍白名单召回
  const teamNames = m.opponents?.map((o: any) => o.opponent?.name?.toUpperCase() || '') || [];
  const teamAcronyms = m.opponents?.map((o: any) => o.opponent?.acronym?.toUpperCase() || '') || [];
  const allTeamInfo = [...teamNames, ...teamAcronyms];

  return VALORANT_VCT_CN_TEAM_WHITELIST.some(t => 
    t.names.some(name => allTeamInfo.includes(name.toUpperCase()))
  );
};

export const fetchMatches = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch('/api/matches');
    const result = await response.json();

    if (response.status !== 200) {
      throw new Error(result.message || result.error || `API 错误: ${response.status}`);
    }

    const data = result.matches;
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('PandaScore API 返回赛程为空');
      throw new Error('EMPTY_SCHEDULE');
    }

    // 用于调试日志
    const valDebug = {
      primary: [] as any[],
      international: [] as any[],
      cn_extended: [] as any[]
    };

    const filteredMatches = data.filter(m => {
      if (!m.begin_at) return false;

      const game = m.videogame?.slug;
      const leagueName = (m.league?.name || '').toUpperCase();
      const leagueSlug = (m.league?.slug || '').toUpperCase();
      const serieName = (m.serie?.name || '').toUpperCase();
      const serieFullName = (m.serie?.full_name || '').toUpperCase();
      const serieSlug = (m.serie?.slug || '').toUpperCase();
      const tournamentName = (m.tournament?.name || '').toUpperCase();
      const tournamentSlug = (m.tournament?.slug || '').toUpperCase();
      const matchName = (m.name || '').toUpperCase();
      
      const allFields = [
        leagueName, leagueSlug, 
        serieName, serieFullName, serieSlug, 
        tournamentName, tournamentSlug, 
        matchName
      ];
      
      const combinedInfo = allFields.join(' ');

      // 1. 识别逻辑
      let category: MatchCategory | null = null;

      if (game === 'valorant') {
        // Valorant 独立识别逻辑
        if (isPrimaryValorantLeague(m, allFields)) {
          category = 'primary';
          if (valDebug.primary.length < 10) valDebug.primary.push(m);
        } else if (isInternationalValorantEvent(m, allFields)) {
          category = 'international';
          if (valDebug.international.length < 10) valDebug.international.push(m);
        } else if (isExtendedCnValorantEvent(m, allFields)) {
          category = 'cn_extended';
          if (valDebug.cn_extended.length < 10) valDebug.cn_extended.push(m);
        }
      } else if (game === 'league-of-legends') {
        // LoL 逻辑保持不变
        // 1. 排除黑名单
        if (EXCLUDE_KEYWORDS.some(kw => combinedInfo.includes(kw))) return false;

        // 第1层：主联赛
        const isPrimary = combinedInfo.includes('LPL') || 
                          combinedInfo.includes('LCK') || 
                          combinedInfo.includes('LEC');
        
        if (isPrimary) category = 'primary';

        // 第2层：国际赛事
        if (!category) {
          const isLolIntl = LOL_INTL_WHITELIST.some(phrase => 
            allFields.some(field => field.includes(phrase))
          );
          if (isLolIntl) category = 'international';
        }

        // 第3层：中国赛区扩展赛事
        if (!category) {
          const isCNExtended = combinedInfo.includes('德玛西亚') || 
                               combinedInfo.includes('DEMACIA') || 
                               combinedInfo.includes('进化者') || 
                               combinedInfo.includes('EVOLUTION') || 
                               combinedInfo.includes('中国赛区') || 
                               combinedInfo.includes('CHINA QUALIFIER') || 
                               combinedInfo.includes('CN QUALIFIER') || 
                               combinedInfo.includes('EWC QUALIFIER') || 
                               combinedInfo.includes('官方杯赛') || 
                               combinedInfo.includes('官方邀请赛');
          if (isCNExtended) category = 'cn_extended';
        }

        // 第4层：战队补充召回
        if (!category) {
          const teamNames = m.opponents?.map((o: any) => o.opponent?.name?.toUpperCase() || '') || [];
          const teamAcronyms = m.opponents?.map((o: any) => o.opponent?.acronym?.toUpperCase() || '') || [];
          const allTeamInfo = [...teamNames, ...teamAcronyms];

          const isLPLTeam = LOL_LPL_TEAM_WHITELIST.some(t => 
            t.names.some(name => allTeamInfo.includes(name.toUpperCase()))
          );

          if (isLPLTeam) {
            category = 'candidate_extended';
          }
        }
      }

      if (category) {
        m.ais_category = category;
        return true;
      }

      return false;
    });

    // 打印 Valorant 调试日志
    console.log('\n--- [DEBUG] Valorant 赛事识别统计 ---');
    console.log(`Primary: ${valDebug.primary.length} (Sample printed below)`);
    console.log(`International: ${valDebug.international.length} (Sample printed below)`);
    console.log(`CN Extended: ${valDebug.cn_extended.length} (Sample printed below)`);

    const printSample = (label: string, matches: any[]) => {
      console.log(`\n[${label} Sample]`);
      matches.forEach(m => {
        console.log(`- League: ${m.league?.name}, Serie: ${m.serie?.full_name || m.serie?.name}, Tournament: ${m.tournament?.name}, Match: ${m.name}`);
      });
    };

    printSample('PRIMARY', valDebug.primary);
    printSample('INTERNATIONAL', valDebug.international);
    printSample('CN_EXTENDED', valDebug.cn_extended);
    console.log('--- [DEBUG END] ---\n');

    const mappedMatches = filteredMatches.map(m => {
      const leagueName = (m.league?.name || '').toUpperCase();
      const serieName = (m.serie?.full_name || m.serie?.name || '').toUpperCase();
      const combined = `${leagueName} ${serieName}`.toUpperCase();
      const isValorant = m.videogame?.slug === 'valorant';
      
      let region: Region = 'LPL';
      if (combined.includes('LPL')) region = 'LPL';
      else if (combined.includes('LCK')) region = 'LCK';
      else if (combined.includes('LEC')) region = 'LEC';
      else if (isValorant && (combined.includes('PACIFIC') || combined.includes('PAC'))) region = 'VCT PAC';
      else if (isValorant && (combined.includes('CHINA') || combined.includes('CN'))) region = 'VCT CN';
      else if (isValorant && combined.includes('EMEA')) region = 'VCT EMEA';
      else if (isValorant) region = 'VCT PAC';

      const teamAId = m.opponents?.[0]?.opponent?.id;
      const teamBId = m.opponents?.[1]?.opponent?.id;
      
      const scoreA = m.results?.find((r: any) => r.team_id === teamAId)?.score ?? 0;
      const scoreB = m.results?.find((r: any) => r.team_id === teamBId)?.score ?? 0;

      return {
        id: String(m.id),
        startTime: m.begin_at,
        region: region,
        teamA: {
          name: m.opponents?.[0]?.opponent?.name || 'TBD',
          shortName: m.opponents?.[0]?.opponent?.acronym || m.opponents?.[0]?.opponent?.name?.substring(0, 3) || 'TBD',
          logo: m.opponents?.[0]?.opponent?.image_url || 'https://picsum.photos/seed/tbd/64/64'
        },
        teamB: {
          name: m.opponents?.[1]?.opponent?.name || 'TBD',
          shortName: m.opponents?.[1]?.opponent?.acronym || m.opponents?.[1]?.opponent?.name?.substring(0, 3) || 'TBD',
          logo: m.opponents?.[1]?.opponent?.image_url || 'https://picsum.photos/seed/tbd/64/64'
        },
        scoreA,
        scoreB,
        status: mapStatus(m.status),
        league: m.league?.name || 'Unknown League',
        format: mapFormat(m.number_of_games),
        category: m.ais_category as MatchCategory
      };
    });

    return {
      matches: mappedMatches,
      lastUpdated: result.lastUpdated,
      source: result.source
    };
  } catch (error) {
    console.error('获取赛程出错:', error);
    throw error;
  }
};

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.PANDASCORE_ACCESS_TOKEN;
const BASE_URL = "https://api.pandascore.co";

if (!API_TOKEN) {
  console.error("CRITICAL ERROR: PANDASCORE_ACCESS_TOKEN is not set in environment variables.");
  process.exit(1);
}

// --- Logic from src/services/pandaScore.ts ---

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

const EXCLUDE_KEYWORDS = [
  'EMEA MASTERS', 'HITPOINT MASTERS', 'TCL MASTERS', 'ARABIAN LEAGUE',
  'REGIONAL LEAGUE', 'LPLOL', 'ACADEMY', 'YOUTH', 'CHALLENGERS',
  'GAME CHANGERS', 'ASCENSION', 'SECONDARY', 'OPEN QUALIFIER',
  'CLOSED QUALIFIER', 'OFF-SEASON', 'VCL', 'PROMOTION',
  'CONTENDERS', 'QUALIFIER'
];

const LOL_INTL_WHITELIST = [
  'FIRST STAND', 'MSI', 'MID-SEASON INVITATIONAL', 'WORLD CHAMPIONSHIP',
  'WORLDS', 'EWC', 'ESPORTS WORLD CUP'
];

const VAL_MASTERS_CITIES = [
  'BANGKOK', 'TORONTO', 'MADRID', 'SHANGHAI', 'TOKYO',
  'REYKJAVIK', 'COPENHAGEN', 'BERLIN', 'SANTIAGO'
];

const VAL_INTL_PHRASES = [
  'VALORANT MASTERS', 'VCT MASTERS', 'VALORANT CHAMPIONS',
  'VCT CHAMPIONS', 'CHAMPIONS TOUR'
];

const mapStatus = (status: string) => {
  switch (status) {
    case 'running': return '进行中';
    case 'finished': return '已结束';
    default: return '待开始';
  }
};

const mapFormat = (numberOfGames: number) => {
  if (numberOfGames === 1) return 'BO1';
  if (numberOfGames === 3) return 'BO3';
  if (numberOfGames === 5) return 'BO5';
  return 'BO3';
};

const isPrimaryValorantLeague = (m: any, allFields: string[]): boolean => {
  if (m.videogame?.slug !== 'valorant') return false;
  const combined = allFields.join(' ');
  
  // 严格排除 VCL
  if (combined.includes('VCL')) return false;

  const hasSystem = combined.includes('VCT') || combined.includes('CHAMPIONS TOUR');
  const hasRegion = combined.includes('CN') || combined.includes('CHINA') || 
                    combined.includes('PACIFIC') || combined.includes('PAC') || 
                    combined.includes('EMEA');
  return hasSystem && hasRegion;
};

const isInternationalValorantEvent = (m: any, allFields: string[]): boolean => {
  if (m.videogame?.slug !== 'valorant') return false;
  const combined = allFields.join(' ');
  
  const blacklist = [
    'EMEA MASTERS', 'HITPOINT MASTERS', 'TCL MASTERS', 
    'ACADEMY', 'YOUTH', 'CHALLENGERS', 'GAME CHANGERS', 
    'ASCENSION', 'SECONDARY', 'REGIONAL LEAGUE', 'VCL'
  ];
  if (blacklist.some(kw => combined.includes(kw))) return false;

  const cities = ['SANTIAGO', 'BANGKOK', 'TORONTO'];
  if (cities.some(city => combined.includes(city) && combined.includes('MASTERS'))) {
    return true;
  }

  const phrases = [
    'VALORANT MASTERS', 'VCT MASTERS', 'MASTERS',
    'VALORANT CHAMPIONS', 'VCT CHAMPIONS', 'CHAMPIONS'
  ];
  
  return phrases.some(phrase => combined.includes(phrase));
};

const isExtendedCnValorantEvent = (m: any, allFields: string[]): boolean => {
  if (m.videogame?.slug !== 'valorant') return false;
  const combined = allFields.join(' ');
  
  // 严格排除 VCL
  if (combined.includes('VCL')) return false;
  
  const keywords = [
    '进化者', 'EVOLUTION', '中国赛区', 
    'CHINA QUALIFIER', 'CN QUALIFIER', 'EWC QUALIFIER',
    'ACL', 'SOOP'
  ];
  if (keywords.some(kw => combined.includes(kw))) return true;

  const teamNames = m.opponents?.map((o: any) => o.opponent?.name?.toUpperCase() || '') || [];
  const teamAcronyms = m.opponents?.map((o: any) => o.opponent?.acronym?.toUpperCase() || '') || [];
  const allTeamInfo = [...teamNames, ...teamAcronyms];

  return VALORANT_VCT_CN_TEAM_WHITELIST.some(t => 
    t.names.some(name => allTeamInfo.includes(name.toUpperCase()))
  );
};

// --- Fetching Logic from server.ts ---

async function fetchAllData() {
  const fetchGameData = async (game: 'lol' | 'valorant') => {
    const types = ['upcoming', 'running', 'past'];
    const results = [];
    
    for (const type of types) {
      const maxPages = 50; 
      const sortParam = type === 'past' ? '-begin_at' : 'begin_at';
      
      for (let page = 1; page <= maxPages; page++) {
        const url = `${BASE_URL}/${game}/matches/${type}?token=${API_TOKEN}&per_page=100&page=${page}&sort=${sortParam}`;
        console.log(`[FETCH] ${game} ${type} Page ${page}`);
        
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`[API ERROR] ${game} ${type} Page ${page} Status: ${response.status}`);
            break; 
          }
          const data = await response.json();
          if (!Array.isArray(data) || data.length === 0) break;
          results.push(...data);
          if (data.length < 100) break;
        } catch (err) {
          console.error(`[FETCH ERROR] ${err}`);
          break;
        }
      }
    }
    return results;
  };

  console.log('Starting data fetch...');
  const [lolData, valData] = await Promise.all([
    fetchGameData('lol'),
    fetchGameData('valorant')
  ]);

  const rawCombined = [...lolData, ...valData];
  
  // Deduplicate
  const uniqueMatchesMap = new Map();
  rawCombined.forEach(m => {
    if (m && m.id) uniqueMatchesMap.set(m.id, m);
  });
  const deduplicatedData = Array.from(uniqueMatchesMap.values());

  // Filter and Transform
  const filteredMatches = deduplicatedData.filter(m => {
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
    let category: string | null = null;

    if (game === 'valorant') {
      if (isPrimaryValorantLeague(m, allFields)) category = 'primary';
      else if (isInternationalValorantEvent(m, allFields)) category = 'international';
      else if (isExtendedCnValorantEvent(m, allFields)) category = 'cn_extended';
    } else if (game === 'league-of-legends') {
      if (EXCLUDE_KEYWORDS.some(kw => combinedInfo.includes(kw))) return false;
      const isPrimary = combinedInfo.includes('LPL') || combinedInfo.includes('LCK') || combinedInfo.includes('LEC');
      if (isPrimary) category = 'primary';
      if (!category) {
        const isLolIntl = LOL_INTL_WHITELIST.some(phrase => allFields.some(field => field.includes(phrase)));
        if (isLolIntl) category = 'international';
      }
      if (!category) {
        const isCNExtended = combinedInfo.includes('德玛西亚') || combinedInfo.includes('DEMACIA') || 
                             combinedInfo.includes('进化者') || combinedInfo.includes('EVOLUTION') || 
                             combinedInfo.includes('中国赛区') || combinedInfo.includes('CHINA QUALIFIER') || 
                             combinedInfo.includes('CN QUALIFIER') || combinedInfo.includes('EWC QUALIFIER') || 
                             combinedInfo.includes('官方杯赛') || combinedInfo.includes('官方邀请赛');
        if (isCNExtended) category = 'cn_extended';
      }
      if (!category) {
        const teamNames = m.opponents?.map((o: any) => o.opponent?.name?.toUpperCase() || '') || [];
        const teamAcronyms = m.opponents?.map((o: any) => o.opponent?.acronym?.toUpperCase() || '') || [];
        const allTeamInfo = [...teamNames, ...teamAcronyms];
        const isLPLTeam = LOL_LPL_TEAM_WHITELIST.some(t => t.names.some(name => allTeamInfo.includes(name.toUpperCase())));
        if (isLPLTeam) category = 'candidate_extended';
      }
    }

    if (category) {
      m.ais_category = category;
      return true;
    }
    return false;
  });

  const mappedMatches = filteredMatches.map(m => {
    const leagueName = (m.league?.name || '').toUpperCase();
    const serieName = (m.serie?.full_name || m.serie?.name || '').toUpperCase();
    const combined = `${leagueName} ${serieName}`.toUpperCase();
    const isValorant = m.videogame?.slug === 'valorant';
    
    let region = 'LPL';
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
      category: m.ais_category
    };
  });

  // Sort by time
  mappedMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const output = {
    matches: mappedMatches,
    lastUpdated: new Date().toISOString(),
    source: "PandaScore"
  };

  const dataDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dataDir, 'matches.json'),
    JSON.stringify(output, null, 2)
  );

  console.log(`Successfully generated matches.json with ${mappedMatches.length} matches.`);
}

fetchAllData().catch(err => {
  console.error(err);
  process.exit(1);
});

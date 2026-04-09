import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";

const API_TOKEN = process.env.PANDASCORE_ACCESS_TOKEN;
const BASE_URL = "https://api.pandascore.co";

if (!API_TOKEN) {
  console.error("CRITICAL ERROR: PANDASCORE_ACCESS_TOKEN is not set in environment variables.");
}

// In-memory cache
interface Cache {
  data: any[];
  lastUpdated: number;
}

let matchesCache: Cache | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy for PandaScore with Caching and Fallback
  app.get("/api/matches", async (req, res) => {
    if (!API_TOKEN) {
      return res.status(500).json({ 
        error: "Configuration Error", 
        message: "PandaScore API Token (PANDASCORE_ACCESS_TOKEN) is missing in server environment." 
      });
    }
    const now = Date.now();
    
    // Check if cache is valid
    if (matchesCache && (now - matchesCache.lastUpdated < CACHE_DURATION)) {
      console.log('[CACHE] Returning cached matches');
      return res.json({
        matches: matchesCache.data,
        lastUpdated: new Date(matchesCache.lastUpdated).toISOString(),
        source: "cache"
      });
    }

    try {
      console.log('--- [DEBUG] 开始全状态赛程抓取 (Upcoming, Running, Past) ---');
      
      const fetchGameData = async (game: 'lol' | 'valorant') => {
        const types = ['upcoming', 'running', 'past'];
        const results = [];
        
        for (const type of types) {
          const maxPages = 50; // Increased to 50 to cover more historical matches
          const sortParam = type === 'past' ? '-begin_at' : 'begin_at';
          
          for (let page = 1; page <= maxPages; page++) {
            const url = `${BASE_URL}/${game}/matches/${type}?token=${API_TOKEN}&per_page=100&page=${page}&sort=${sortParam}`;
            console.log(`[FETCH] ${game} ${type} Page ${page}: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
              console.error(`[API ERROR] ${game} ${type} Page ${page} Status: ${response.status}`);
              break; 
            }
            
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              results.push(...data);
              // Stop if we have fewer results than per_page, or if it's 'running' (usually few)
              if (data.length < 100 || type === 'running') break;
            } else {
              break;
            }
          }
        }
        return results;
      };

      // Fetch all states for both games
      const [lolData, valData] = await Promise.all([
        fetchGameData('lol'),
        fetchGameData('valorant')
      ]);

      const rawCombined = [...lolData, ...valData];
      
      // Deduplicate by ID
      const uniqueMatchesMap = new Map();
      rawCombined.forEach(m => {
        if (m && m.id) {
          uniqueMatchesMap.set(m.id, m);
        }
      });
      
      const deduplicatedData = Array.from(uniqueMatchesMap.values());
      
      // Sort by begin_at ascending
      deduplicatedData.sort((a, b) => {
        return new Date(a.begin_at).getTime() - new Date(b.begin_at).getTime();
      });

      const earliestMatch = deduplicatedData.length > 0 ? deduplicatedData[0].begin_at : 'N/A';
      const latestMatch = deduplicatedData.length > 0 ? deduplicatedData[deduplicatedData.length - 1].begin_at : 'N/A';

      console.log(`[SUCCESS] 抓取完成。去重后: ${deduplicatedData.length}`);
      console.log(`[RANGE] 最早: ${earliestMatch}, 最晚: ${latestMatch}`);

      // Update cache
      matchesCache = {
        data: deduplicatedData,
        lastUpdated: now
      };

      res.json({
        matches: deduplicatedData,
        lastUpdated: new Date(now).toISOString(),
        source: "pandascore"
      });
    } catch (error) {
      console.error("[FATAL] 代理服务器请求失败:", error);
      
      // Fallback to cache if available even if expired
      if (matchesCache) {
        console.log('[FALLBACK] PandaScore failed, returning stale cache');
        return res.json({
          matches: matchesCache.data,
          lastUpdated: new Date(matchesCache.lastUpdated).toISOString(),
          source: "stale-cache"
        });
      }

      res.status(500).json({ 
        error: "无法获取赛程数据", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

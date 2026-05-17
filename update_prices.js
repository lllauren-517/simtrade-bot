const { createClient } = require('@supabase/supabase-js');
const yahooFinance = require('yahoo-finance2').default;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function updateAllStockPrices() {
  // 1. 先從 Supabase 抓出現有商品清單
  const { data: securities } = await supabase.from('securities').select('symbol');
  if (!securities) return;

  for (const item of securities) {
    try {
      // 台股代號需要加上 .TW (例如 2330 變成 2330.TW)
      let fetchSymbol = item.symbol;
      if (/^\d{4}$/.test(fetchSymbol)) fetchSymbol += '.TW';

      const quote = await yahooFinance.quote(fetchSymbol);
      const currentPrice = quote.regularMarketPrice;

      if (currentPrice) {
        // 將最新價格寫回 Supabase
        await supabase.from('securities').update({ 
          price: currentPrice, 
          updated_at: new Date() 
        }).eq('symbol', item.symbol);
        console.log(`更新成功: ${item.symbol} -> $${currentPrice}`);
      }
    } catch (err) { console.error(`更新失敗: ${item.symbol}`); }
    
    // 停頓 1 秒避免被 Yahoo 封鎖
    await new Promise(res => setTimeout(res, 1000));
  }
}

updateAllStockPrices();

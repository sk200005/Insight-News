const rssFeeds = {
  indianPolitics: [
    { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { name: "ThePrint", url: "https://theprint.in/category/politics/feed/" },
    { name: "OpIndia", url: "https://www.opindia.com/category/politics/feed/" },
    { name: "Scroll", url: "https://scroll.in/tag/politics/rss" },
  ],
  indianEconomy: [
    { name: "The Hindu Business", url: "https://www.thehindu.com/business/feeder/default.rss" },
    { name: "Economic Times", url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms" },
  ],
  indianSports: [
    { name: "The Hindu Sport", url: "https://www.thehindu.com/sport/feeder/default.rss" },
    { name: "NDTV Sports", url: "https://sports.ndtv.com/rss/all" },
    { name: "ESPN Cricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml" },
  ],
  worldPolitics: [
    { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Guardian World", url: "https://www.theguardian.com/world/rss" },
  ],
  worldEconomy: [
    { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  ],
  worldSports: [
    { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
    { name: "Reuters Sports", url: "https://www.reuters.com/lifestyle/sports/rss" },
  ],
};

module.exports = { rssFeeds };


// rssFeeds is a JavaScript Object
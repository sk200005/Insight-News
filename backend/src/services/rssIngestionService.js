const Parser = require("rss-parser");
const Article = require("../models/Article");
const { rssFeeds } = require("../config/rssFeeds");
const { selectFeedsForCycle } = require("./feedSelector");
const { getSourceLean } = require("../../utils/sourceBiasMap");

const parser = new Parser();
const TARGET_ARTICLE_BATCH_SIZE = 3;

function shuffleFeeds(feeds) {
  const shuffled = [...feeds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

async function updateExistingArticleCategory(link, sourceGroup, source) {
  const existingArticle = await Article.findOne({ link });

  if (!existingArticle) {
    return false;
  }

  let shouldSave = false;

  if (!existingArticle.sourceGroup && sourceGroup) {
    existingArticle.sourceGroup = sourceGroup;
    shouldSave = true;
  }

  if (!existingArticle.source && source) {
    existingArticle.source = source;
    shouldSave = true;
  }

  const mappedSourceLean = getSourceLean(existingArticle.source || source);

  if (existingArticle.sourceLean !== mappedSourceLean) {
    existingArticle.sourceLean = mappedSourceLean;
    shouldSave = true;
  }

  if (shouldSave) {
    if (!existingArticle.sourceLean) {
      existingArticle.sourceLean = "center";
    }

    await existingArticle.save();
  }

  return true;
}

/**
  * const selectedFeed = {
      name: "The Hindu",
      url: "https://www.thehindu.com/news/national/feeder/default.rss",
      category: "indianPolitics"
    };
    
    selectedFeed is an object with the following properties:
    - name: The name of the feed.
    - url: The URL of the feed.
    - category: The category of the feed.
  */


async function fetchArticleForCategory(selectedFeed) {
  const categoryFeeds = rssFeeds[selectedFeed.category] || [];
  const alternateFeeds = shuffleFeeds(
    categoryFeeds.filter((feed) => feed.url !== selectedFeed.url)
  );
  const feedsToTry = [selectedFeed, ...alternateFeeds];       //... operator spreads the array

  for (const feed of feedsToTry) {
    try {
      const parsedFeed = await parser.parseURL(feed.url);    // Downloads the RSS XML.
      const items = parsedFeed.items || [];

      for (const item of items) {
        if (!item?.link) {            //Skip invalid articles
          continue;
        }

        const alreadyExists = await updateExistingArticleCategory(
          item.link,
          selectedFeed.category,
          feed.name
        );

        if (alreadyExists) {
          continue;
        }

        const article = new Article({
          title: item.title || "Untitled Article",
          link: item.link,
          source: feed.name,
          sourceLean: getSourceLean(feed.name),
          sourceGroup: selectedFeed.category,
          publishedAt: item.pubDate || item.isoDate || new Date(),
          content: item.contentSnippet || item.content || "",
          image: item.enclosure?.url || "",
          processingStatus: "pending",
        });

        if (!article.sourceLean) {
          article.sourceLean = "center";
        }

        console.log("Source:", article.source);
        console.log("Source Lean:", article.sourceLean);

        await article.save();
        return article;
      }
    } catch (error) {
      console.error(`RSS fetch error for ${feed.name}:`, error.message);
    }
  }

  return null;
}





//////////////////////////// Read this function - createCategoryFetcher ///////////////////////////////////////////

/**
 * const selectedFeed = {
  name: "The Hindu",
  url: "https://www.thehindu.com/news/national/feeder/default.rss",
  category: "indianPolitics"
};

feedsToTry: [The Hindu, The Print, Op India, Scroll]

feedsToTry is an array of objects with the following properties:
- name: The name of the feed.
- url: The URL of the feed.
- category: The category of the feed.
*/

function createCategoryFetcher(selectedFeed) {
  let started = false;
  let exhausted = false;
  let feedCursor = 0;
  let itemCursor = 0;
  let feedsToTry = [];
  let currentItems = [];
  let currentFeed = null;

  async function loadCurrentFeedItems() {
    while (feedCursor < feedsToTry.length) {
      const feed = feedsToTry[feedCursor];
      feedCursor += 1;

      try {
        const parsedFeed = await parser.parseURL(feed.url);
        currentFeed = feed;
        currentItems = parsedFeed.items || [];
        itemCursor = 0;
        return;
      } catch (error) {
        console.error(`RSS fetch error for ${feed.name}:`, error.message);
      }
    }

    exhausted = true;
  }

  return {
    get category() {
      return selectedFeed.category;
    },
    async nextArticle() {
      if (exhausted) {
        return null;
      }

      if (!started) {
        const categoryFeeds = rssFeeds[selectedFeed.category] || [];
        const alternateFeeds = shuffleFeeds(
          categoryFeeds.filter((feed) => feed.url !== selectedFeed.url)
        );

        feedsToTry = [selectedFeed, ...alternateFeeds];
        started = true;
      }

      while (!exhausted) {
        if (itemCursor >= currentItems.length) {
          await loadCurrentFeedItems();

          if (exhausted) {
            return null;
          }
        }

        const item = currentItems[itemCursor];
        itemCursor += 1;

        if (!item?.link) {
          continue;
        }

        const alreadyExists = await updateExistingArticleCategory(
          item.link,
          selectedFeed.category,
          currentFeed?.name || selectedFeed.name
        );

        if (alreadyExists) {
          continue;
        }

        const article = new Article({
          title: item.title || "Untitled Article",
          link: item.link,
          source: currentFeed?.name || selectedFeed.name,
          sourceLean: getSourceLean(currentFeed?.name || selectedFeed.name),
          sourceGroup: selectedFeed.category,
          publishedAt: item.pubDate || item.isoDate || new Date(),
          content: item.contentSnippet || item.content || "",
          image: item.enclosure?.url || "",
          processingStatus: "pending",
        });

        if (!article.sourceLean) {
          article.sourceLean = "center";
        }

        console.log("Source:", article.source);
        console.log("Source Lean:", article.sourceLean);

        await article.save();
        return article;
      }

      return null;
    },
  };
}

async function ingestArticles() {
  const selectedFeeds = selectFeedsForCycle(rssFeeds);
  const savedArticles = [];
  const fetchers = selectedFeeds.map((feed) => createCategoryFetcher(feed));
  let activeFetchers = [...fetchers];

  while (
    activeFetchers.length > 0 &&
    savedArticles.length < TARGET_ARTICLE_BATCH_SIZE
  ) {
    let roundAddedArticle = false;
    const nextActiveFetchers = [];

    for (const fetcher of activeFetchers) {
      const article = await fetcher.nextArticle();

      if (article) {
        savedArticles.push(article);
        roundAddedArticle = true;
      }

      if (savedArticles.length >= TARGET_ARTICLE_BATCH_SIZE) {
        break;
      }

      if (article !== null) {
        nextActiveFetchers.push(fetcher);
      }
    }

    activeFetchers = nextActiveFetchers;

    if (!roundAddedArticle && activeFetchers.length === 0) {
      break;
    }
  }

  return {
    count: savedArticles.length,
    articles: savedArticles,
    selectedFeeds: selectedFeeds.map(({ name, category }) => ({ name, category })),
  };
}

module.exports = { ingestArticles };

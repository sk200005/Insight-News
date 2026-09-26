// Select feeds → fetch RSS articles → 
// skip duplicates → add metadata → 
// save new articles to MongoDB → stop after 3 new articles.


const Parser = require("rss-parser");      //downloads/parses RSS feeds.
const Article = require("../models/Article");
const { rssFeeds } = require("../config/rssFeeds");
const { selectFeedsForCycle } = require("./feedSelector");
const { getSourceLean } = require("../../utils/sourceBiasMap");

const parser = new Parser();
const TARGET_ARTICLE_BATCH_SIZE = 3;

/**
 * Shuffles an array of feeds using the Fisher-Yates algorithm.
 * Motive: Randomizes the order of alternate feeds to avoid heavily favoring one source over another.
 * Input: {Array} feeds - Array of feed objects.
 * Output: {Array} - A new array containing the shuffled feeds.
 * Usage: Used internally by fetchArticleForCategory and createCategoryFetcher to randomize alternate feeds.
 */
function shuffleFeeds(feeds) {    // Fisher-Yates shuffle Algorithm.
  const shuffled = [...feeds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

/**
 * Checks if an article with a given link already exists in the database and updates its metadata if missing.
 * Motive: Prevents duplicate articles from being ingested while ensuring existing articles have proper sourceGroup and sourceLean data.
 * Input: 
 *   - {string} link - The URL link of the article to check.
 *   - {string} sourceGroup - The category of the feed.
 *   - {string} source - The name of the feed source.
 * Output: {boolean} - Returns true if the article already exists, false if it's a new article.
 * Usage: Used internally by fetchArticleForCategory and createCategoryFetcher's nextArticle method before saving a new article.
 */
async function updateExistingArticleCategory(link, sourceGroup, source) {
  // true = duplicate already exists --> update source group and source lean if missing --> save --> true
  // false = new article -> just return false

  const existingArticle = await Article.findOne({ link });

  if (!existingArticle) {   // if no existing article found
    return false;
  }

  let shouldSave = false;

  if (!existingArticle.sourceGroup && sourceGroup) {   // if source group is not found
    existingArticle.sourceGroup = sourceGroup;
    shouldSave = true;
  }

  if (!existingArticle.source && source) {         // if source is not found
    existingArticle.source = source;
    shouldSave = true;
  }

  const mappedSourceLean = getSourceLean(existingArticle.source || source);    // Maps source to lean

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
  *
  * Motive: Ensures at least one valid, non-duplicate article is fetched for a specific category, handling feed failures gracefully.
  * Input: {Object} selectedFeed - The primary feed object (contains name, url, category).
  * Output: {Object|null} - Returns the saved Article document, or null if no new articles were found.
  * Usage: Potentially used by standalone fetching tasks, though current architecture favors createCategoryFetcher and ingestArticles for batch processing.
  */

async function fetchArticleForCategory(selectedFeed) {


  //fetchArticleForCategory(selectedFeed) fetches the first new/unique article from an RSS category.

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
*
* Motive: Allows for round-robin article fetching across different categories without fetching all articles from one feed at once.
* Input: {Object} selectedFeed - The primary feed object to start fetching from.
* Output: {Object} - An object with a 'category' getter and a 'nextArticle' async method.
* Usage: Used by ingestArticles to maintain state and pull articles from different categories evenly.
*/

function createCategoryFetcher(selectedFeed) {

  //creates a stateful article fetcher that returns one new article at a time across multiple RSS feeds.

                //  loadCurrentFeedItems()
                //          ↓
                //  LOAD RSS FEED
                //          ↓
                //  put RSS articles in currentItems
                //          ↓
                //  nextArticle()
                //          ↓
                //  CHECK articles one-by-one
                //          ↓
                //  save new article to MongoDB


  let started = false;
  let exhausted = false;
  let feedCursor = 0;    // which RSS feed
  let itemCursor = 0;    // which article
  let feedsToTry = [];   // Array of feeds to try for the current category
  let currentItems = [];   // Array of articles from the current feed
  let currentFeed = null;   // The feed object of the currently processing feed

  async function loadCurrentFeedItems() {

    // Load the next available RSS feed and store its articles in currentItems, 
    // so nextArticle() can process those articles one by one.

    while (feedCursor < feedsToTry.length) {    //while not all feeds have been tried
      const feed = feedsToTry[feedCursor];    //get the next feed
      feedCursor += 1;    //increment the feed cursor

//              parsedFeed = {
//                 title: "The Hindu",
//                 items: [
//                        { title: "Article 1", link: "..." },
//                        { title: "Article 2", link: "..." },
//                        { title: "Article 3", link: "..." }
//                        ]
//              }
      try {
        const parsedFeed = await parser.parseURL(feed.url); //download rss
        currentFeed = feed;
        currentItems = parsedFeed.items || [];
        itemCursor = 0;    // We have switched to a new feed "Hindu" -> "OpIndia" 
                           // so we need to start from its first article.
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

/**
 * Orchestrates the RSS ingestion cycle across multiple selected categories.
 * Motive: The main entry point for the RSS ingestion pipeline. It selects feeds, creates fetchers, and pulls articles in a round-robin manner up to a batch limit.
 * Input: None. (Uses feedSelector and imported config internally).
 * Output: {Object} - A summary object containing the count of saved articles, the articles themselves, and the feeds selected for this cycle.
 * Usage: Expected to be called by a cron job, scheduler, or an API controller to trigger the RSS ingestion pipeline.
 */
async function ingestArticles() {
  const selectedFeeds = selectFeedsForCycle(rssFeeds);      // calls rotateFeed four times to select 1 feed from each category and then shuffles them.
  const savedArticles = [];
  const fetchers = selectedFeeds.map((feed) => createCategoryFetcher(feed));    // [{ category: 'indianPolitics', nextArticle: [Function: nextArticle] },...]
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

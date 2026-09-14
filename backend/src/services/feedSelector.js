const lastSelectedSources = new Map();
const FEEDS_PER_CYCLE = 4;
const FEED_GROUP_ORDER = [
  "indianPolitics",
  "indianEconomy",
  "worldPolitics",
];

/**
 * Motive: Randomizes the order of elements in an array using the Fisher-Yates algorithm.
 * Input: {Array} items - The original array of items to be shuffled.
 * Output: {Array} A new array containing the same items in a randomized order.
 */
function shuffleList(items) {
  const shuffled = [...items]; // spread operator -> Copy the array into a new array

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    // This syntax is array destructuring assignment, 
    // allowing two variables to be swapped without a temporary variable.
  }

  return shuffled;
}

/**
 * Motive: Selects a random single feed from a given group of feeds.
 * Input: {Array} group - An array of feed objects.
 * Output: {Object} A single randomly selected feed object from the group.
 */
function randomFeed(group) {
  const index = Math.floor(Math.random() * group.length);
  return group[index];
}

/**
 * Motive: Selects a random feed from a category group while attempting to avoid selecting the exact same feed source consecutively. 
 * It tracks the last picked source in a global Map.
 * Input: 
 *   - {Array} group: An array of feed objects belonging to a specific category.
 *   - {string} category: The name of the category (e.g., 'indianPolitics').
 * Output: {Object|null} A randomly selected feed object different from the last cycle (if possible), or null if the group is empty.
 */
function rotateFeed(group, category) {
  if (!Array.isArray(group) || group.length === 0) {
    return null;
  }

  const lastSource = lastSelectedSources.get(category);
  const eligibleFeeds = group.filter((feed) => feed.name !== lastSource);
  const selectionPool = eligibleFeeds.length > 0 ? eligibleFeeds : group;
  const selectedFeed = randomFeed(selectionPool);

  lastSelectedSources.set(category, selectedFeed.name);

  return selectedFeed;
}

/**
 * Motive: Coordinates the selection of a subset of feeds for the current scraping cycle. It picks one rotated feed from each configured category, shuffles the resulting list, and limits it to FEEDS_PER_CYCLE.
 * Input: {Object} feeds - An object where keys are category names and values are arrays of feed objects for that category.
 * Output: {Array} An array of selected feed objects, each annotated with its respective category, ready for ingestion.
 */
function selectFeedsForCycle(feeds) {
  const groupedFeeds = FEED_GROUP_ORDER
    .map((category) => {
      const selectedFeed = rotateFeed(feeds[category], category);

      if (!selectedFeed) {
        return null;
      }

      return {
        ...selectedFeed,
        category,
      };
    })
    .filter(Boolean);

  return shuffleList(groupedFeeds).slice(0, FEEDS_PER_CYCLE);
}

module.exports = { FEEDS_PER_CYCLE, randomFeed, selectFeedsForCycle };

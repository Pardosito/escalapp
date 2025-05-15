import { getDatabase } from './configdb.js';
import { ObjectId } from 'mongodb';


const ROUTES_COLLECTION = 'routes';
const CHALLENGES_COLLECTION = 'challenges';
const COMMUNITIES_COLLECTION = 'communities';


const searchCollectionByTitleDB = async (collectionName, queryText) => {
  try {
    const db = getDatabase();
    const collection = db.collection(collectionName);

    if (!queryText || typeof queryText !== 'string' || queryText.length < 1) {
        return [];
    }

    const query = { title: { $regex: queryText, $options: 'i' } };

    let projection = {
        _id: 1,
        title: 1,
        description: 1,
        createdAt: 1,
    };

    if (collectionName === ROUTES_COLLECTION) {
        projection.images = 1;
        projection.likes = 1;
        projection.difficultyLevel = 1;
    } else if (collectionName === CHALLENGES_COLLECTION) {
        projection.image = 1;
        projection.startDate = 1;
        projection.endDate = 1;
        projection.currentParticipants = 1;
    } else if (collectionName === COMMUNITIES_COLLECTION) {
        projection.image = 1;
        projection.memberCount = 1;
    }


    const results = await collection.find(query).project(projection).toArray();

    const resultsWithType = results.map(item => ({ ...item, type: collectionName }));


    return resultsWithType;

  } catch (error) {
    console.error(`Error searching collection ${collectionName} by title:`, error);
    throw error;
  }
};


export const performSearch = async (req, res) => {
    try {
        const queryText = req.query.q;
        const searchType = req.query.type || 'all';

        if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
            return res.status(400).json({ message: 'Search query (q) is required and cannot be empty.' });
        }

        const validTypes = ['route', 'challenge', 'community', 'all'];
        if (!validTypes.includes(searchType.toLowerCase())) {
             return res.status(400).json({ message: `Invalid search type. Must be one of: ${validTypes.join(', ')}` });
        }

        let searchResults = [];

        if (searchType.toLowerCase() === 'route' || searchType.toLowerCase() === 'all') {
            const routeResults = await searchCollectionByTitleDB(ROUTES_COLLECTION, queryText);
            searchResults = searchResults.concat(routeResults);
        }

        if (searchType.toLowerCase() === 'challenge' || searchType.toLowerCase() === 'all') {
            const challengeResults = await searchCollectionByTitleDB(CHALLENGES_COLLECTION, queryText);
            searchResults = searchResults.concat(challengeResults);
        }

        if (searchType.toLowerCase() === 'community' || searchType.toLowerCase() === 'all') {
            const communityResults = await searchCollectionByTitleDB(COMMUNITIES_COLLECTION, queryText);
            searchResults = searchResults.concat(communityResults);
        }

        res.status(200).json(searchResults);


    } catch (error) {
        console.error('Error in performSearch controller:', error);
        res.status(500).json({ message: 'Internal server error during search operation.' });
    }
};
require('format-unicorn');
const _ = require('underscore');
const axios = require("axios");
const FormData = require('form-data');
const pgp = require('pg-promise')();
const config = require('./twitterConfig.json');
const database = pgp(config.database);

const authenticate = async () => {
    const formData = new FormData();
    formData.append('grant_type', 'client_credentials');

    const request = {
        'method': 'POST',
        'url': '{0}://{1}/{2}'.formatUnicorn(config.protocall, config.host, config.authEndpoint),
        'auth': {
            'username': config.authConsumerKey,
            'password': config.authConsumerSecret
        }, 'headers': formData.getHeaders(),
        'data': formData
    };

    try {
        const response = await axios(request);
        console.log('successful authentication');
        return response.data.access_token;
    } catch (error) {
        console.log('auth error', error && error.response);
        return Promise.reject('unable to authenticate');
    }
};

const fetchTweets = async authToken => {
    let countRemaining = config.feedSize;
    let nextQueryMaxId = await findMinTweetId();
    while (countRemaining > 0) {
        const count = _.min([countRemaining + 1, config.maxQuerySize]);
        countRemaining -= count - 1; // -1 due to duplicates. see comment @insertTweets

        try {
            const tweets = await query(authToken, config.feed, count, nextQueryMaxId);
            insertTweets(tweets);
            nextQueryMaxId = _.last(tweets).id_str;
        } catch (error) {
            console.log('tweets error', error);
        };
    }
};

const query = async (authToken, feed, count, maxId) => {
    const request = {
        'method': 'GET',
        'url': '{0}://{1}/{2}'.formatUnicorn(config.protocall, config.host, config.feedEndpoint),
        'headers': {
            'Authorization': 'Bearer {0}'.formatUnicorn(authToken)
        },
        'params': {
            'screen_name': feed,
            'count': count,
            'max_id': maxId
        }
    };

    try {
        const response = await axios(request);
        console.log('successfully fetched {0} tweets'.formatUnicorn(response.data.length));
        return response.data;
    } catch (error) {
        console.log('query error', error && error.response);
        return Promise.reject('unable to query feed {0}'.formatUnicorn(feed));
    }
};

const findMinTweetId = () => {
    const findMinTweetQuery = 'SELECT MIN(tweet_id) FROM tweet';
    return database.one(findMinTweetQuery).then(minTweetId => {
        return minTweetId.min;
    }).catch(error => {
        console.log('error finding minimum tweet id', error);
        return Promise.reject('database min tweet id error {0}'.formatUnicorn(findMinTweetQuery));
    });
};

const insertTweets = tweets => {
    /*
        javascript does not support 64 bit ints
        This means we must resort to TEXT tweetId and can't do the more optimal max_id = tweetId - 1 in our query params.
        This means we will recieve a single duplicate tweet in each query (that is, each query will include a tweet that we recieved in the previous query)
        We resolve this with a UNIQUE constraint on the tweet_id and the ON CONFLICT DO NOTHING in our insertion query
    */

    const columnSet = new pgp.helpers.ColumnSet(['tweet_id', 'text', 'hash'], {table: 'tweet'});
    const values = _.map(tweets, tweet => {
        return {
            'tweet_id': tweet.id_str,
            'text': tweet.text,
            'hash': _.pluck(tweet.entities.hashtags, 'text')
        };
    });
    const insertionQuery = '{0} {1}'.formatUnicorn(pgp.helpers.insert(values, columnSet), 'ON CONFLICT DO NOTHING');

    database.none(insertionQuery).then(() => {
        console.log('successfully inserted {0} tweets'.formatUnicorn(tweets.length));
    }).catch(error => {
        console.log('database insert error', error);
    });
};

authenticate()
    .then(fetchTweets)
    .catch(error => {
        console.log('something bad happened', error);
    });

# twitter

## preperations
* npm install
* have psql running
    * `brew install psql`
    * `brew services start postgresql`
* modify config as needed
* run `node databaseSetup.js`
* run `node twitter.js`

## config
```json
{
    "protocall": "https",
    "host": "api.twitter.com",
    "authEndpoint": "oauth2/token",
    "authConsumerKey": "...",
    "authConsumerSecret": "...",
    "feedEndpoint": "1.1/statuses/user_timeline.json",

    "database": "twitter",
    "maxQuerySize": 200,

    "feed": "twitterapi",
    "feedSize": 500
}
```

### top section
hardcoded app constants for connecting to twitter

### middle section
* databasename: the psql database to connect to. make sure to rerun database script after changing this property
* maxQuerySize: maximum value 200, minimum value 2. the number of tweets to fetch per callout.

### bottom section
* feed: name of which feed to fetch
* feedSize: how many tweets to fetch every time script is ran. minimum value 2. 

## databaseSetup.js
make sure you've disconnected any psql connections before running. this script will drop the database (if exists), create a fresh database, create the table, and create the index on hash tags.

successfull output:

```
database: twitter

dropping database if exists
database dropped

creating database
database created

creating table
table created

creating index
index created

successful
```

## twitter.js
make sure you've ran `databaseSetup.js` since the last time you modified the `config.js` `database` field. this scripts will connect fetch up to `feedSize` tweets from the `feed` feed from twitter each time it is ran.

it is possible to fetch less than `feedSize` tweets, because deleted tweets will not be returned by twitter but will not be adjusted for in the calculations.

if the `twitter` table is empty, the script will fetch the most recent tweets. if the table is not empty, the script will fetch the most recent tweets that are older than any tweets stored in the table. in this way, running the script `n` times will populate the table with the most recent `~n * feedSize` tweets that had occured prior to first running the script. it is trivial to swap this logic (e.g. to fetch newer tweets rather than older tweets), by simply modifing the query param `max_id` with `since_id`.

successfull output:

```
successful authentication
successfully fetched 200 tweets
successfully inserted 200 tweets
successfully fetched 200 tweets
successfully inserted 200 tweets
successfully fetched 102 tweets
successfully inserted 102 tweets
```
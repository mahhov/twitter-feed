require('format-unicorn');

const database = require('./twitterConfig.json').database;
console.log('database:', database);

const pgp = require('pg-promise')();
const template1 = pgp('template1');

const dropDatabaseQuery = 'DROP DATABASE "{0}"'.formatUnicorn(database);
const createDatabaseQuery = 'CREATE DATABASE "{0}"'.formatUnicorn(database);
const createTableQuery = 'CREATE TABLE tweet(id SERIAL NOT NULL, tweet_id TEXT UNIQUE, text TEXT, hash TEXT[])';
const createIndexQuery = 'CREATE INDEX ON "tweet" (hash)';

const dropDatabase = () => {
    console.log('\ndropping database if exists');
    return template1.query(dropDatabaseQuery).then(() => {
        console.log('database dropped');
    }).catch(() => {
        console.log('database not dropped');
    });
};

const createDatabase = () => {
    console.log('\ncreating database');
    return template1.query(createDatabaseQuery).then(() => {
        console.log('database created');
        return pgp(database);
    }).catch(error => {
        return Promise.reject('unable to create database: {0}'.formatUnicorn(createDatabaseQuery));
    });
};

const createTable = (db) => {
    console.log('\ncreating table');
    return db.query(createTableQuery).then(() => {
        console.log('table created');
        return db;
    }).catch(error => {
        return Promise.reject('unable to create table: {0}'.formatUnicorn(createTableQuery));
    });
};

const createIndex = (db) => {
    console.log('\ncreating index');
    return db.query(createIndexQuery).then(() => {
        console.log('index created');
    }).catch(error => {
        return Promise.reject('unable to create index: {0}'.formatUnicorn(createIndexQuery));
    });
};

dropDatabase()
    .then(createDatabase)
    .then(createTable)
    .then(createIndex)
    .then(() => {
        console.log('\nsuccessful')
    }).catch(error => {
        console.log('\n{0}'.formatUnicorn(error));
    });

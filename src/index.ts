import 'reflect-metadata';
import Container from 'typedi';
import OrderbookStreamIndexer from './indexers/OrderbookStreamIndexer';
import AsksIndexer from './indexers/AsksIndexer';
import BidsIndexer from './indexers/BidsIndexer';
import IndexerLogService from './services/IndexerLogService';

// The IndexerLogService is used to log nice tables to the console
const indexerLogService = Container.get(IndexerLogService);

// The main websocket indexer
const streamingIndexer = new OrderbookStreamIndexer();

// The backup indexers
const indexers = [
  new AsksIndexer(),
  new BidsIndexer(),
];

// Register the indexers with the IndexerLogService
indexers.forEach((indexer) => {
  indexerLogService.registerIndexer(indexer);
});

// Start the IndexerLogService
indexerLogService.start();

// Start the indexers
Promise.all([
  ...indexers.map((item) => item.start()),
  streamingIndexer.start(),
]);

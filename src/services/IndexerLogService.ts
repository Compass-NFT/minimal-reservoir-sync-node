import { Service } from 'typedi';
import moment from 'moment';
import ReservoirBaseIndexer from '../indexers/ReservoirBaseIndexer';

@Service()
export default class IndexerLogService {
  private indexers: ReservoirBaseIndexer[] = [];

  interval: NodeJS.Timer | null;

  constructor() {
    this.interval = null;
  }

  registerIndexer(indexer) {
    this.indexers.push(indexer);
  }

  start() {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(async () => {
      console.clear();
      console.log(`Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`);
      console.log('Active backfills:');
      const backfillData: any[] = [];
      this.indexers.forEach((indexer) => {
        indexer.backfillWorkers.filter((worker) => worker.isRunning).forEach((worker) => {
          backfillData.push({
            indexer: indexer.constructor.name.replace('Indexer', ''),
            start: moment(worker.startTimestamp).format('YYYY-MM-DD'),
            isRunning: worker.isRunning,
            ...worker.stats,
          });
        });
      });
      console.table(backfillData);
      console.log('Upkeep workers:');
      const upkeepData: any[] = [];
      this.indexers.forEach((indexer) => {
        upkeepData.push({
          indexer: indexer.constructor.name.replace('Indexer', ''),
          start: moment(indexer.upkeepWorker?.startTimestamp).format('YYYY-MM-DD HH:mm:ss'),
          ...indexer.upkeepWorker?.stats,
        });
      });
      console.table(upkeepData);
    }, 1000);
  }
}

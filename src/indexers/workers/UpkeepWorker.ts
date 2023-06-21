import sleep from '../../utils/sleep';

/* eslint-disable no-await-in-loop */
interface IUpkeepWorkerConfig {
  startTimestamp: Date;
  fetchData: (params: any) => Promise<any>;
  getData: (data: any) => Promise<Array<any>>;
  getContinuation?: (data: any) => string | null;
  commit: (data: any) => Promise<any>;
}

export default class UpkeepWorker {
  startTimestamp: Date;

  fetchData: (params: any) => Promise<any>;

  getData: (data: any) => Promise<any[]>;

  getContinuation: (data: any) => string | null;

  commit: (data: any) => Promise<any>;

  stats: { fetched: number; committed: number; requests: number; errors: number; };

  constructor({
    startTimestamp,
    fetchData,
    getData,
    getContinuation = (data) => data.continuation,
    commit,
  }: IUpkeepWorkerConfig) {
    this.startTimestamp = startTimestamp;
    this.fetchData = fetchData;
    this.getData = getData;
    this.getContinuation = getContinuation;
    this.commit = commit;

    this.stats = {
      fetched: 0,
      committed: 0,
      requests: 0,
      errors: 0,
    };
  }

  async start(): Promise<void> {
    let continuation: string | null = null;
    let lastTimestamp: Date | null = null;
    let lastItemCount = 0;
    const startFrom = this.startTimestamp;
    do {
      try {
        const data = await this.fetchData({
          startTimestamp: Math.floor(startFrom.getTime() / 1000),
          continuation: continuation || undefined,
          limit: 1000,
        });
        this.stats.requests += 1;

        const items = await this.getData(data);
        this.stats.fetched += items.length;
        lastTimestamp = items.length > 0 ? new Date(items[items.length - 1].updatedAt) : null;

        if (items.length > 0) {
          await this.commit(items);
          this.stats.committed += items.length;
        }

        // There is a huge volume of data for bids so to prevent lagging too much behind
        // we update the startTimestamp to the earliest updatedAt timestamp of the last batch
        // so it's saved in the state and used as the startTimestamp when the worker is restarted
        this.startTimestamp = items.length > 0 ? new Date(items[0].updatedAt) : this.startTimestamp;

        continuation = this.getContinuation(data);
        lastItemCount = items.length;
      } catch (e) {
        this.stats.errors += 1;
        // TODO: implement exponential backoff
      }
    } while (continuation);

    if (lastTimestamp) {
      this.startTimestamp = lastTimestamp;
    }

    if (lastItemCount < 1000) {
      await sleep(15000);
    }

    return this.start();
  }
}

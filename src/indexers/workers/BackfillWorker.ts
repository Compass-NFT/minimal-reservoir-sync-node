/* eslint-disable no-restricted-syntax */

import { IWorkerState } from '../../interfaces';

/* eslint-disable no-await-in-loop */
interface IBackfillWorkerConfig {
  startTimestamp: Date;
  endTimestamp: Date;
  continuation: string | null;
  fetchData: (params: any) => Promise<any>;
  getData: (data: any) => Promise<Array<any>>;
  getContinuation?: (data: any) => string | null;
  commit: (data: any) => Promise<any>;
}

export default class BackfillWorker {
  startTimestamp: Date;

  endTimestamp: Date;

  continuation: string | null;

  fetchData: (params: any) => Promise<any>;

  getData: (data: any) => Promise<any[]>;

  getContinuation: (data: any) => string | null;

  commit: (data: any) => Promise<any>;

  isRunning: boolean = false;

  isDone: boolean = false;

  stats: { fetched: number; committed: number; requests: number; errors: number; };

  constructor({
    startTimestamp,
    endTimestamp,
    continuation,
    fetchData,
    getData,
    getContinuation = (data) => data.continuation,
    commit,
  }: IBackfillWorkerConfig) {
    this.startTimestamp = startTimestamp;
    this.endTimestamp = endTimestamp;

    this.continuation = continuation;
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

  private async* run(): AsyncGenerator<any[], void, unknown> {
    do {
      try {
        const response = await this.fetchData({
          startTimestamp: Math.floor(this.startTimestamp.getTime() / 1000),
          endTimestamp: Math.floor(this.endTimestamp.getTime() / 1000),
          continuation: this.continuation ? this.continuation : undefined,
          limit: 1000,
          status: 'active',
        });
        this.stats.requests += 1;

        const data = await this.getData(response);
        this.stats.fetched += data.length;
        yield data;

        this.continuation = this.getContinuation(response);
      } catch (e) {
        console.log('error', e);
        this.stats.errors += 1;
      }
    } while (this.continuation);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    for await (const data of this.run()) {
      await this.commit(data);
      this.stats.committed += data.length;
    }

    this.isRunning = false;
    this.isDone = true;
  }

  getState(): IWorkerState {
    return {
      startTimestamp: this.startTimestamp,
      endTimestamp: this.endTimestamp,
      continuation: this.continuation,
    };
  }
}

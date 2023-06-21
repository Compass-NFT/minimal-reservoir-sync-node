import sdkFactory from 'api';
import moment from 'moment';
import Queue from 'queue';
import BackfillWorker from './workers/BackfillWorker';
import { IIndexer, IIndexerState } from '../interfaces';
import { redis } from '../lib/redis';
import UpkeepWorker from './workers/UpkeepWorker';

export default abstract class ReservoirBaseIndexer implements IIndexer {
  protected sdk: any;

  public backfillWorkers: BackfillWorker[];

  public upkeepWorker?: UpkeepWorker;

  private backfillStart!: Date;

  private backfillEnd!: Date;

  private stateKey: string;

  constructor() {
    this.sdk = sdkFactory('@reservoirprotocol/v3.0#5fxm01pliufqnan');
    this.sdk.auth(process.env.RESERVOIR_API_KEY || 'demo-api-key');

    this.backfillWorkers = [];

    this.stateKey = `Indexer:State:${this.constructor.name}`;
  }

  /**
   * Fetch data from the API
   *
   * @param params The params to pass to the API
   */
  protected abstract fetchData(params: any): Promise<any>;

  /**
   * Extract the data from the API response
   *
   * @param data The response from the API
   */
  protected abstract getData(data: any): Promise<any[]>;

  /**
   * Method to commit the formatted data to the database
   */
  protected abstract commit(data: Array<any>): Promise<any>;

  public async start(): Promise<void> {
    // start backfilling
    await this.startBackfill();

    // backfill is now started and an end timestamp is available
    // start the upkeep worker
    await this.startUpkeep();
  }

  private async startBackfill(): Promise<void> {
    const state = await this.getState('backfill');

    if (state) {
      // restore the workers from the state
      this.backfillStart = new Date(state.startTimestamp);
      this.backfillEnd = new Date(state.endTimestamp);
      // restore the workers
      state.workers.forEach((workerState) => {
        this.backfillWorkers.push(
          this.createBackfillWorker(new Date(workerState.startTimestamp), new Date(workerState.endTimestamp), workerState.continuation),
        );
      });
    } else {
      // no state, start from scratch
      const start = await this.fetchData({
        limit: 1,
        status: 'active',
      }).then((res) => this.getData(res)).then((res) => new Date(res[0].updatedAt));

      const end = new Date();

      // break the range into 1 day chunks
      const startTimestamp = moment(start);
      const endTimestamp = moment(end);

      this.backfillStart = start;
      this.backfillEnd = end;

      do {
        const nextEnd = moment(startTimestamp).endOf('day');

        this.backfillWorkers.push(
          this.createBackfillWorker(startTimestamp.toDate(), moment.min(nextEnd, endTimestamp).toDate()),
        );

        startTimestamp.add(1, 'day').startOf('day');
      } while (startTimestamp.isBefore(endTimestamp));
    }

    const queue = new Queue({
      concurrency: 6,
      autostart: false,
    });

    // add the workers to the queue
    this.backfillWorkers.forEach((worker) => {
      queue.push(worker.start.bind(worker));
    });

    await this.saveBackfillState();

    const backfillStateInterval = setInterval(async () => {
      await this.saveBackfillState();
    }, 5000);

    queue.start((err) => {
      if (err) {
        throw err;
      }

      // We don't need to save the state anymore
      clearInterval(backfillStateInterval);
    });
  }

  /**
   * Start the upkeep worker
   */
  private async startUpkeep(): Promise<void> {
    const { startTimestamp } = await this.getState('upkeep').then((res) => res || {} as any);

    this.upkeepWorker = new UpkeepWorker({
      startTimestamp: startTimestamp ? new Date(startTimestamp) : this.backfillEnd,
      fetchData: this.fetchData.bind(this),
      getData: this.getData.bind(this),
      commit: this.commit.bind(this),
    });

    this.upkeepWorker.start();

    setInterval(async () => {
      await this.saveUpkeepState();
    }, 5000);
  }

  /**
   * Get the state for a specific job type from storage (redis)
   * @param type The job type
   * @returns The state or null if it doesn't exist
   */
  private async getState(type: string): Promise<IIndexerState | null> {
    const state = await redis.hget(this.stateKey, type);

    if (state) {
      return JSON.parse(state);
    }

    return null;
  }

  /**
   * Set the state for a specific job type in storage (redis)
   *
   * @param type The job type
   * @param state The state to set
   */
  private async setState(type: string, state: IIndexerState): Promise<void> {
    await redis.hset(this.stateKey, type, JSON.stringify(state));
  }

  /**
   * Collect the state of the backfill workers and save it to storage (redis)
   */
  private async saveBackfillState(): Promise<void> {
    const state: IIndexerState = {
      startTimestamp: this.backfillStart,
      endTimestamp: this.backfillEnd,
      workers: this.backfillWorkers.filter((worker) => !worker.isDone).map((worker) => ({
        startTimestamp: worker.startTimestamp,
        endTimestamp: worker.endTimestamp,
        continuation: worker.continuation,
      })),
    };

    await this.setState('backfill', state);
  }

  /**
   * Collect the state of the upkeep worker and save it to storage (redis)
   */
  private async saveUpkeepState(): Promise<void> {
    const state: IIndexerState = {
      startTimestamp: this.upkeepWorker!.startTimestamp,
      endTimestamp: this.upkeepWorker!.startTimestamp,
      workers: [],
    };

    await this.setState('upkeep', state);
  }

  /**
   * Create a backfill worker for a specific date range
   * @param start The start date
   * @param end The end date
   * @param continuation Optional continuation token
  */
  private createBackfillWorker(start: Date, end: Date, continuation: string | null = null): BackfillWorker {
    return new BackfillWorker({
      startTimestamp: start,
      endTimestamp: end,
      continuation,
      fetchData: this.fetchData.bind(this),
      getData: this.getData.bind(this),
      commit: this.commit.bind(this),
    });
  }
}

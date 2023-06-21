export interface IWorkerState {
  startTimestamp: Date;
  endTimestamp: Date;

  continuation: string | null;
}

export interface IIndexerState {
  startTimestamp: Date;
  endTimestamp: Date;

  workers: Array<IWorkerState>
}

export interface IIndexer {
  start(): Promise<void>;
}

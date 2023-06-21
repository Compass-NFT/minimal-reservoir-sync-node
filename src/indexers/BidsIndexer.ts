import Container from 'typedi';
import { Bid } from '@prisma/client';
import ReservoirBaseIndexer from './ReservoirBaseIndexer';
import OrderStorageService from '../services/OrderStorageService';
import { mapBid } from './utils/map-orders';

export default class BidsIndexer extends ReservoirBaseIndexer {
  storageService: OrderStorageService;

  constructor() {
    super();

    this.storageService = Container.get(OrderStorageService);
  }

  protected fetchData(params: any): Promise<any> {
    return this.sdk.getOrdersBidsV5({
      sortBy: 'updatedAt',
      sortDirection: 'asc',
      accept: '*/*',
      ...params,
    }).then((res) => res.data);
  }

  protected getData(data: any): Promise<Bid[]> {
    return Promise.all(
      data.orders.map(mapBid),
    );
  }

  protected async commit(data: Array<Bid>) {
    return this.storageService.saveBidBulk(data);
  }
}

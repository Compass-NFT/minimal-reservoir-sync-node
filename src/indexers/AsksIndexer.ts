import Container from 'typedi';
import { Ask } from '@prisma/client';
import OrderStorageService from '../services/OrderStorageService';
import ReservoirBaseIndexer from './ReservoirBaseIndexer';
import { mapAsk } from './utils/map-orders';

export default class AsksIndexer extends ReservoirBaseIndexer {
  storageService: OrderStorageService;

  constructor() {
    super();

    this.storageService = Container.get(OrderStorageService);
  }

  protected fetchData(params: any): Promise<any> {
    return this.sdk.getOrdersAsksV4({
      sortBy: 'updatedAt',
      sortDirection: 'asc',
      accept: '*/*',
      ...params,
    }).then((res) => res.data);
  }

  protected getData(data: any): Promise<Ask[]> {
    // to do - map the data to the format we want
    return Promise.all(
      data.orders.filter((item) => item.criteria.kind === 'token').map(mapAsk),
    );
  }

  protected async commit(data: Array<Ask>) {
    return this.storageService.saveAskBulk(data);
  }
}

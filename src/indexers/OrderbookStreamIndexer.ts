import Container from 'typedi';
import WebsocketService from '../services/WebsocketService';
import { IIndexer } from '../interfaces';

export default class OrderbookStreamIndexer implements IIndexer {
  async start(): Promise<void> {
    const websocketService = Container.get(WebsocketService);
    websocketService.connect();
  }
}

/* eslint-disable class-methods-use-this */
import { Service } from 'typedi';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import OrderStorageService from './OrderStorageService';
import { mapAsk, mapBid } from '../indexers/utils/map-orders';

type MessageEvent = 'ask.created' | 'ask.updated' | 'bid.created' | 'bid.updated';
@Service()
export default class WebsocketService extends EventEmitter {
  private ws: WebSocket | null = null;

  private isConnected = false;

  private lastMessageTimestamp = 0;

  private lastMessageReceivedAt = 0;

  private watcherInterval: NodeJS.Timeout | null = null;

  reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private orderStorageService: OrderStorageService) {
    super();
  }

  connect() {
    if (this.isConnected) {
      return;
    }

    if (this.ws !== null) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket(`wss://ws.reservoir.tools?api_key=${process.env.RESERVOIR_API_KEY}`);

    this.ws?.on('close', this.onClose.bind(this));
    this.ws?.on('error', this.onError.bind(this));
    this.ws?.on('message', this.onMessage.bind(this));
    this.ws?.on('open', this.onOpen.bind(this));
  }

  private reconnectDelay = 1000; // Start with a 1 second delay

  private onOpen() {
    console.log('onOpen');
    this.isConnected = true;
    this.reconnectDelay = 1000; // Reset the reconnect delay
    this.emit('connected');
    this.onConnected();

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private onClose() {
    console.log('onClose');
    this.isConnected = false;

    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws?.close();
      }
      if (this.reconnectTimeout !== null) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelay);

      // Increase the delay for the next possible reconnect, up to a maximum limit
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // 30 seconds maximum delay
    } catch (err) {
      console.error(err);
    }
  }

  private onError(err) {
    console.error(err);
  }

  private async onMessage(message: Buffer) {
    try {
      const {
        type, status, data, event, published_at: publishedAt,
      } = JSON.parse(
        message.toString('utf-8'),
      );
      if (publishedAt && publishedAt > this.lastMessageReceivedAt) {
        this.lastMessageReceivedAt = publishedAt;
      }

      this.lastMessageTimestamp = Date.now();

      if (event === 'subscribe') return;
      if (type === 'connection' && status === 'ready') {
        this.isConnected = true;
        this.onConnected();
        return;
      }

      if (event?.includes('ask')) {
        const order = await mapAsk(data);
        await this.orderStorageService.saveAsk(order);
      }

      if (event?.includes('bid')) {
        const order = await mapBid(data);
        await this.orderStorageService.saveBid(order);
      }
    } catch (err) {
      console.error(err);
    }
  }

  private onConnected() {
    if (this.watcherInterval !== null) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = null;
    }
    this.subscribe('ask.created');
    this.subscribe('ask.updated');

    this.subscribe('bid.created');
    this.subscribe('bid.updated');

    this.watcherInterval = setInterval(() => {
      if (this.lastMessageTimestamp === 0) {
        return;
      }

      // detect stale connection
      if (this.isConnected && Date.now() - this.lastMessageTimestamp > 10000) {
        console.log('no message in 10 seconds, closing connection', Date.now() - this.lastMessageTimestamp);
        this.onClose();
        return;
      }

      this.emit('lastMessageTimestamp', this.lastMessageReceivedAt);
    }, 5000);
  }

  private subscribe(event: MessageEvent): void {
    this.ws?.send(
      JSON.stringify({
        type: 'subscribe',
        event,
      }),
    );
  }
}

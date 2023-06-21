/* eslint-disable class-methods-use-this */
import { Service } from 'typedi';

import { Ask, Bid } from '@prisma/client';
import prisma from '../prisma';

@Service()
export default class OrderStorageService {
  saveAsk(order: Ask) {
    return prisma.ask.upsert({
      where: {
        id: order.id,
      },
      update: order,
      create: order,
    });
  }

  saveBid(order: Bid) {
    return prisma.bid.upsert({
      where: {
        id: order.id,
      },
      update: order,
      create: order,
    });
  }

  saveAskBulk(orders: Ask[]) {
    return prisma.$transaction(
      orders.map((order) => this.saveAsk(order)),
    );
  }

  saveBidBulk(orders: Bid[]) {
    return prisma.$transaction(
      orders.map((order) => this.saveBid(order)),
    );
  }
}

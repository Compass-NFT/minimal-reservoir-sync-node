import {
  Ask, Bid, BidType, Prisma,
} from '@prisma/client';

const getBidType = (bid) => {
  if (bid.criteria.kind === 'token') {
    return BidType.TOKEN;
  }

  if (bid.criteria.kind === 'attribute') {
    return BidType.ATTRIBUTE;
  }

  if (bid.criteria.kind === 'collection') {
    return BidType.COLLECTION;
  }

  return BidType.OTHER;
};

export async function mapBid(item): Promise<Bid> {
  return {
    id: item.id,
    makerId: item.maker,
    takerId: item.taker,
    type: getBidType(item),
    collectionId: item.contract,
    tokenId: item.criteria.kind === 'token' ? `${item.contract}_${item.criteria.data.token.tokenId}` : null,
    attributeKey: item.criteria.kind === 'attribute' ? item.criteria.data.attribute.attributeKey : null,
    attributeValue: item.criteria.kind === 'attribute' ? item.criteria.data.attribute.attributeValue : null,
    quantityFilled: item.quantityFilled,
    quantityRemaining: item.quantityRemaining,
    price: new Prisma.Decimal(item.price.amount.decimal),
    priceUsd: new Prisma.Decimal(item.price.amount.usd),
    priceCurrency: item.price.currency.contract,
    priceNative: new Prisma.Decimal(item.price.amount.native),
    feeBps: item.feeBps,
    status: item.status.toUpperCase(),
    createdAt: new Date(item.createdAt),
    expiresAt: new Date(item.validUntil * 1000),
    validFrom: new Date(item.validFrom * 1000),
    marketplace: item.source.domain,
    updatedAt: new Date(item.updatedAt),
  };
}

export async function mapAsk(item): Promise<Ask> {
  return {
    id: item.id,
    makerId: item.maker,
    takerId: item.taker,
    collectionId: item.contract,
    tokenId: `${item.contract}_${item.criteria.data.token.tokenId}`,
    quantityFilled: item.quantityFilled,
    quantityRemaining: item.quantityRemaining,
    price: new Prisma.Decimal(item.price.amount.decimal),
    priceUsd: new Prisma.Decimal(item.price.amount.usd),
    priceCurrency: item.price.currency.contract,
    priceNative: new Prisma.Decimal(item.price.amount.native),
    feeBps: item.feeBps,
    status: item.status.toUpperCase(),
    createdAt: new Date(item.createdAt),
    expiresAt: new Date(item.validUntil * 1000),
    validFrom: new Date(item.validFrom * 1000),
    marketplace: item.source.domain,
    updatedAt: new Date(item.updatedAt),
  };
}

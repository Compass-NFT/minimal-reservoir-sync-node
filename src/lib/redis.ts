/* eslint-disable import/prefer-default-export */
import Redis from 'ioredis';

export const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
};

export const redis = new Redis(REDIS_CONNECTION.port, REDIS_CONNECTION.host);

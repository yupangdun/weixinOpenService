import { Context } from 'egg';
import * as redis from 'redis';
import { parseString } from 'xml2js';
import config from '../config';
const MYREDIS = Symbol('Application#myRedis');

export default {
    // redis 封装
    get myRedis() {
        if (!this[MYREDIS]) {
            this[MYREDIS] = new RedisClientClass();
        }
        return this[MYREDIS] as RedisClient;
    },
    // body XML => JSON
    async xml2json(ctx: Context): Promise<any> {
        let data = '';
        ctx.req.setEncoding('utf8');
        ctx.req.on('data', (chunk: any) => {
            data += chunk;
        });
        const getxml = await new Promise((resolve) => {
            ctx.req.on('end', () => {
                resolve(data);
            });
        });
        const parseObj: any = await new Promise((resolve) => {
            parseString(getxml, {
                explicitArray: false,
            }, (_err: any, json: any) => {
                resolve(json);
            });
        });
        const xml = ctx.service.aes.decrypt(parseObj.xml.Encrypt);
        return new Promise((resolve, reject) => {
            parseString(xml, {
                explicitArray: false,
            }, (_err: any, json: any) => {
                if (_err) {
                    reject(_err);
                } else {
                    resolve(json);
                }
            });
        });
    },
};

interface RedisClient {
    get(key: string): Promise<string>;
    set(key: string, value: string, seconds?: number): Promise<string>;
};

class RedisClientClass {
    redis: redis.RedisClient;
    constructor() {
        this.redis = redis.createClient(config.redisPort, config.redisHost, {
            password: config.redisPassword,
        });
    }
    get(key: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                this.redis.get(key, (error, value) => {
                    error ? reject(error) : resolve(value);
                });
            } catch (e) {
                reject(e);
            }
        });
    };
    set(key: string, value: string, seconds: number): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                if (seconds) {
                    this.redis.setex(key, seconds, value, (error) => {
                        error ? reject(error) : resolve();
                    });
                } else {
                    this.redis.set(key, value, (error) => {
                        error ? reject(error) : resolve();
                    });
                }
            } catch (e) {
                reject(e);
            }
        });
    }
};

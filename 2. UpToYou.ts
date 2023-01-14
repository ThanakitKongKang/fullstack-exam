/*
    1. จงประยุกต์ใช้เทคนิค In-Memory caching เพื่อเพิ่ม performance ให้ระบบ URL Shortener
     2. จงเพิ่มระบบ rate limiter ให้ระบบ URL Shortener
*/

// import libray สำหรับ caching ในตัวอย่างนี้จะใช้ lru-cach
import * as lru from 'lru-cache';

// สร้าง instance สำหรับ lru cache ใน UrlShortenerService.ts
const cache = new lru({
    max: 500, // maximum number of items in the cache
    maxAge: 1000 * 60 * 60 // expire items after 1 hour
});

// ใช้ Cache เก็บ mapping ของ short URLs ไปยัง original URLs เมื่อสร้าง short URL ใหม่
async shortenUrl(url: string): Promise<string> {
    const existing = cache.get(url);
    if (existing) {
        return existing;
    }
    // ... create new short URL and save to database
    cache.set(url, shortUrl);
    return shortUrl;
}

// ใช้ cache ค้นหา Original URL เมื่อใช้ฟังก์ชัน resolveUrl()
async resolveUrl(id: string): Promise<string> {
    const url = cache.get(id);
    if (url) {
        return url;
    }
    // ... lookup original URL in the database
    cache.set(id, originalUrl);
    return originalUrl;
}

// เมื่อ apply ทุก step ให้กับ  UrlShortenerService.ts จะได้ดังนี้
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url } from './url.entity';
import * as lru from 'lru-cache';

@Injectable()
export class UrlShortenerService {
    constructor(
        @InjectRepository(Url)
        private readonly urlRepository: Repository<Url>,
    ) {}

    const BASE_URL = 'http://shorturl.com/';
    const cache = new lru({
    max: 500, // maximum number of items in the cache
    maxAge: 1000 * 60 * 60 // expire items after 1 hour
    });

    async shortenUrl(url: string): Promise<string> {
        try {
            const existingInCache = cache.get(url);
            if (existingInCache) {
            return existingInCache;
            }

            const existing = await this.urlRepository.findOne({ where: { original: url } });
            if (existing) {
                return `${this.BASE_URL}/${existing.id}`;
            }

            const newUrl = new Url();
            newUrl.original = url;
            await this.urlRepository.save(newUrl);
            cache.set(url, `${this.BASE_URL}/${newUrl.id}`);

            return `${this.BASE_URL}/${newUrl.id}`;
        } catch (error) {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async resolveUrl(id: string): Promise<string> {
        try {
            const cachedUrl = cache.get(id);
            if (cachedUrl) {
                return cachedUrl;
            }

            const url = await this.urlRepository.findOne({ where: { id } });
            if (!url) {
                throw new HttpException(`URL not found`, HttpStatus.NOT_FOUND);
            }
            cache.set(id, url.original);
            return url.original;
        } catch (error) {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

/*
    2. จงเพิ่มระบบ rate limiter ให้ระบบ URL Shortener
*/

// import libray สำหรับ limit request ในตัวอย่างนี้จะใช้ fast-ratelimiter
import * as rateLimiter from 'fast-ratelimiter';

// สร้าง instance สำหรับ rate limiter ใน UrlShortenerService.ts
const limiter = new rateLimiter({
    points: 5, // Number of requests
    duration: 1, // Per duration seconds
});

// ใช้ rate limiter ในฟังก์ชัน shortenUrl()
@Post()
async shortenUrl(@Body() createUrlDto: CreateUrlDto, @Req() req): Promise<string> {
    try {
        const ip = req.ip;
        const limited = await limiter.consume(ip);
        if (limited) {
            throw new HttpException(`Too many requests`, HttpStatus.TOO_MANY_REQUESTS);
        }
        // ... create new short URL and save to database
        return shortUrl;
    } catch (error) {
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

// เมื่อ apply ทุก step ให้ UrlShortenerService.ts จะได้ดังนี้
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url } from './url.entity';
import * as lru from 'lru-cache';
import * as rateLimiter from 'fast-ratelimiter';

@Injectable()
export class UrlShortenerService {
    constructor(
        @InjectRepository(Url)
        private readonly urlRepository: Repository<Url>,
    ) {}

    const BASE_URL = 'http://shorturl.com/';
    const cache = new lru({
    max: 500, // maximum number of items in the cache
    maxAge: 1000 * 60 * 60 // expire items after 1 hour
    });

    const limiter = new rateLimiter({
        points: 5, // Number of requests
        duration: 1, // Per duration seconds
    });

    async shortenUrl(@Body() createUrlDto: CreateUrlDto, @Req() req): Promise<string> {
        try {
            const ip = req.ip;
            const limited = await limiter.consume(ip);
            if (limited) {
                throw new HttpException(`Too many requests`, HttpStatus.TOO_MANY_REQUESTS);
            }

            const existingInCache = cache.get(url);
            if (existingInCache) {
            return existingInCache;
            }

            const existing = await this.urlRepository.findOne({ where: { original: url } });
            if (existing) {
                return `${this.BASE_URL}/${existing.id}`;
            }

            const newUrl = new Url();
            newUrl.original = url;
            await this.urlRepository.save(newUrl);
            cache.set(url, `${this.BASE_URL}/${newUrl.id}`);

            return `${this.BASE_URL}/${newUrl.id}`;
        } catch (error) {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async resolveUrl(id: string): Promise<string> {
        try {
            const cachedUrl = cache.get(id);
            if (cachedUrl) {
                return cachedUrl;
            }

            const url = await this.urlRepository.findOne({ where: { id } });
            if (!url) {
                throw new HttpException(`URL not found`, HttpStatus.NOT_FOUND);
            }
            cache.set(id, url.original);
            return url.original;
        } catch (error) {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
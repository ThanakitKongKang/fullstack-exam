/* 
### 1. System Design
จงออกแบบระบบย่อ URL พร้อม demo
เช่น ย่อ http://my-order.ai/long-url/very-sub-path ให้เป็น http://shorturl.com/abcde
สามารถระบุรายละเอียด เช่น 
- database
- back-end
- front-end
- deployment
พร้อมเหตุผลที่เลือกใช้

    Backend Stacks:  ใช้ NestJS ในการสร้าง backend และใช้ MySQL ในการเก็บข้อมูล
    เหตุผล: NestJS เป็น NodeJS framework ที่มีความคล้ายคลึงกับ Angular ที่ MyOrder ใช้ ซึ่งทำให้ง่ายต่อการเข้าใจสำหรับ developer 
    และใช้ MySQL เพราะเป็น database ที่ผู้สอบมีความชำนาญมากที่สุด

    Frontend Stacks: ใช้ ReactJS ในการสร้าง frontend
    เหตุผล: ReactJS เป็น framework ที่ผู้สอบมีความชำนาญมากที่สุด

    Deployment: ใช้ DigitalOcean เพราะเป็นแพลตฟอร์มที่มี Region Singapore ซึ่งใกล้กับฐานผู้ใช้ SEA 
    มีราคาถูกกว่า AWS มีความปลอดภัยสูงกว่า Heroku และเป็นแพลตฟอร์มที่ผู้สอบมีความชำนาญมากที่สุด
*/


/*
    Backend High-Level Design:
    1. สร้าง UrlShortenerService
        Service นี้ต้องมี method สองตัว คือ shortenUrl(url: string) และ resolveUrl(id: string)
        โดย method shortenUrl จะรับ long url มา แล้ว return shortened url กลับไป
        และ method resolveUrl จะรับ shortened url id มา แล้ว return original url กลับไป

    2. สร้าง UrlShortenerController
        Controller นี้จะมี endpoint สองตัว คือ @Post() และ @Get()
        โดย endpoint @Post() จะรับ long url มา แล้ว return shortened url กลับไป
        โดย endpoint @Get() จะรับ shortened url id มา แล้ว redirect ไปยัง original url

    3. สร้าง database เพื่อเก็บข้อมูล url map และเพิ่ม database service ไปยัง app module
    4. เพิ่ม middleware ที่จะตรวจสอบ rate limiting ของจำนวน request ต่อ user
    5. เพิ่ม security เพื่อป้องกัน request ที่มีความเสี่ยง และเพิ่มวิธีในการติดตามจำนวนคลิกของ shortened url
    6. สร้าง user interface ที่อนุญาตให้ผู้ใช้งานสามารถย่อ url ของตนเองได้ และดูสถิติการใช้งาน เช่น จำนวนคลิก
*/


// ตัวอย่างของ UrlShortenerService
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url } from './url.entity';

@Injectable()
export class UrlShortenerService {
    constructor(
        @InjectRepository(Url)
        private readonly urlRepository: Repository<Url>,
    ) {}

    const BASE_URL = 'http://shorturl.com/';

    async shortenUrl(url: string): Promise<string> {
        try {
            const existing = await this.urlRepository.findOne({ where: { original: url } });
            if (existing) {
                return `${this.BASE_URL}/${existing.id}`;
            }

            const newUrl = new Url();
            newUrl.original = url;
            await this.urlRepository.save(newUrl);

            return `${this.BASE_URL}/${newUrl.id}`;
        } catch (error) {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async resolveUrl(id: string): Promise<string> {
        try {
            const url = await this.urlRepository.findOne({ where: { id } });
            if (!url) {
                throw new HttpException(`URL not found`, HttpStatus.NOT_FOUND);
            }
            return url.original;
        } catch (error) {
            throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

// ตัวอย่างของ UrlShortenerController
@Controller('/shorten')
export class UrlShortenerController {
    constructor(private readonly urlShortenerService: UrlShortenerService) {}

    @Post()
    async shortenUrl(@Body() url: string): Promise<string> {
        return this.urlShortenerService.shortenUrl(url);
    }

    @Get(':id')
    async redirect(@Param('id') id: string): Promise<string> {
        return this.urlShortenerService.resolveUrl(id);
    }
}

// ตัวอย่าง Url Entity โดยใช้ TypeORM
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Url {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 2048 })
    original: string;

    @Column()
    createdAt: Date;

    @Column({ default: 0 })
    clicks: number;
}


//  ตัวอย่างวิธีในการติดตามจำนวนคลิกของ shortened url
@Get(':id')
async trackClicks(@Param('id') id: string): Promise<string> {
    try {
        const url = await this.urlRepository.findOne({ where: { id } });
        if (!url) {
            throw new HttpException(`URL not found`, HttpStatus.NOT_FOUND);
        }
        const click = new Clicks();
        click.url = url;
        click.ip = req.connection.remoteAddress;
        await this.clicksRepository.save(click);
        return url.original;
    } catch (error) {
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}


/*
    Frontend High-Level Design:
    1. สร้างหน้าที่มี form สำหรับย่อ url และแสดงผลลัพธ์ 
        - มี Text field และ ปุ่ม submit
        - เมื่อ user submit form ให้ส่ง request ไปยัง backend 
        - รอรับ response short url กลับมา 
        - แสดงผลลัพธ์
        - user สามารถคัดลอก short url ได้โดยการกดปุ่ม copy

    2. สร้างหน้าสำหรับแสดงรายการ url ที่ย่อไว้
        - แสดงรายการ url ที่ย่อไว้
        - แสดงจำนวนคลิกของแต่ละ url
        - แสดงจำนวนคลิกของแต่ละ url ในแต่ละวัน
        - สามารถลบ url ออกจากรายการ

    3. สร้างหน้า login และ signup สำหรับผู้ใช้งาน
        - มี form สำหรับ login และ signup
        - มีปุ่มสำหรับ login และ signup ผ่าน platform ต่าง ๆ เช่น facebook, google, twitter, github, linkedin
*/


// ตัวอย่าง ReactJS code หน้า form
import React, { useState } from 'react';

const ShortenForm = () => {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/shorten', {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setShortUrl(data.shortUrl);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="url">
        Enter URL:
        <input
          type="text"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <button type="submit">Shorten</button>
      {shortUrl && <p>Shortened URL: {shortUrl}</p>}
    </form>
  );
};

export default ShortenForm;
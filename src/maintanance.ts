import fs from 'fs';
import path from 'path';
import { pg } from "@database";
import { isValidImage } from '@extractor/exhentai';

const maintanance = {
    async listMissingGalleriesDisk() {
        const rows = (await pg.select('dir').table('gallery'));
        const missing: string[] = []
        await Promise.all(rows.map(row => {
            return new Promise((resolve) => {
                try {
                    //console.log(path.join(process.env.VAULT_PATH!, row.dir))
                    fs.accessSync(path.join(process.env.VAULT_PATH!, row.dir), fs.constants.R_OK);
                }
                catch (err) {
                    missing.push(row.dir)
                }
                resolve();
            })
        }))
        console.log(missing);
        return;
    },

    async listBrokenImages() {
        const rows = (await pg.raw("SELECT g.id, p.page_number, CONCAT(g.dir, '/', p.filename) as file FROM gallery g JOIN page p ON g.id = p.id_gallery LIMIT 100;")).rows;
        const missing: Array<{
            id: string, page: number
        }> = [];
        await Promise.all(rows.map(async (row: any) => {
            const filepath = path.join(process.env.VAULT_PATH!, row.file);
            if (!(await isValidImage(filepath))) {
                missing.push({
                    id: row.id,
                    page: row.page_number
                })
            }
        }))
        console.log(missing);
    },

    async duplicatedFilesOnDisk() {
        const rows = (await pg.raw("SELECT g.dir, g.length FROM gallery g")).rows;
        const mismatched: any[][] = [];
        await Promise.all(rows.map(async (row: any) => {
            const files = fs.readdirSync(path.join(process.env.VAULT_PATH!, row.dir));
            const dif = files.length - Number(row.length);
            if (dif > 0) {
                mismatched.push([row.dir, dif]);
            }
        }))
        return mismatched;
        //console.log(mismatched);
        //console.log(mismatched.length)
    },

    async missingFilesOnDisk() {
        const rows = (await pg.raw("SELECT g.dir, g.length FROM gallery g")).rows;
        const mismatched: any[][] = [];
        await Promise.all(rows.map(async (row: any) => {
            const files = fs.readdirSync(path.join(process.env.VAULT_PATH!, row.dir));
            const dif = files.length - Number(row.length);
            if (dif < 0) {
                mismatched.push([row.dir, dif]);
            }
        }))
        return mismatched;
        //console.log(mismatched);
        //console.log(mismatched.length)
    },

    async fixPagesOnDatabase() {
        const rows = (await pg.raw("SELECT g.dir, g.id FROM gallery g")).rows;
        const promises: Array<Promise<any>> = [];
        rows.forEach((row: any) => {
            const files = fs.readdirSync(path.join(process.env.VAULT_PATH!, row.dir));
            if (files.length === 0) {
                console.log("Empty: " + row.dir);
                return;
            }
            const name = files[0].split(".");
            let comparator;
            if (isNaN(Number(name))) {
                comparator = undefined
            }
            else {
                comparator = (a: string, b: string) => Number(a) - Number(b);
            }
            files.sort(comparator);
            files.map((async (file: string, index: number) => {
                promises.push(pg('page').insert({
                    id_gallery: row.id,
                    page_number: index + 1,
                    filename: file
                }))
            }))
        })
        return Promise.all(promises);
    },

    async removeJPEGs() {
        const dirs = await this.duplicatedFilesOnDisk();
        await Promise.all(dirs.map((async (dir: any) => {
            const files = fs.readdirSync(path.join(process.env.VAULT_PATH!, dir[0]));
            await Promise.all(files.map(async (file: string) => {
                if (file.endsWith("jpeg")) {
                    fs.unlinkSync(path.join(process.env.VAULT_PATH!, dir[0], file))
                }
            }))
        })))
    }
}

export default maintanance;
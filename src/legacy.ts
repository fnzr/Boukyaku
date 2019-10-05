import fs from "fs";
import logUpdate from 'log-update';
import path from 'path';
import { listGalleriesLegacy, insertGallery, pgLegacy, pg } from "@database";
import { loadURL, saveTags } from "@extractor/exhentai";

export async function convertGalleries() {
    const legacyGalleries = await listGalleriesLegacy();
    await Promise.all(legacyGalleries.map(async (legacyGallery: Gallery) => {
        return insertGallery({
            dir: legacyGallery.dir,
            title: legacyGallery.title,
            original_title: legacyGallery.title,
            url: legacyGallery.url,
            length: legacyGallery.page_count || 0,
            category: 'doujinshi',
            hidden: false,
        })
    }));
}

export async function exportPages() {
    const rows = await pgLegacy.select('dir').table('gallery');
    await Promise.all(rows.map(async (row) => {
        const g = await pg.select('id').table('gallery').where({ dir: row.dir }).first();

        const pages = await pgLegacy.select(['page_number', 'filename']).table('page').where({ id_gallery: g.id });

        return Promise.all(pages.map(async page => {
            await pg('page').insert({
                id_gallery: g.id,
                page_number: page.page_number,
                filename: page.filename
            })
        }))
    }));
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deadPages() {
    console.log("????")
    const rows = (await pg.raw('select id, dir from gallery')).rows
    let c = 0;
    const s = new Set();
    rows.forEach((row: { id: number, dir: string }, index: number) => {
        const p = path.join(process.env.VAULT_PATH!, row.dir, 'gallery');
        if (!fs.existsSync(p)) {
            //console.log("Not exists: " + row.dir);
            //s.add(row.dir)
            return;
        }

        const files = fs.readdirSync(p);
        if (isNaN(Number(files[0].split('.')[0]))) {
            files.sort()
        }
        else {
            files.sort((a: string, b: string) => {
                const x = Number(a.split('.')[0]);
                const y = Number(b.split('.')[0]);
                return x - y;
            })
        }
        //console.log(files)
        files.forEach((filename, index) => {
            if (!fs.existsSync(path.join(p, filename))) {
                console.log("how the fuck");
                return;
            }
            //console.log(pg.raw("update page set filename = ? where id_gallery = ? and page_number = ?", [filename, row.id, index + 1]).toString());
            pg.raw("update page set filename = ? where id_gallery = ? and page_number = ?", [filename, row.id, index + 1]).then();
        })

        //c++;
    })
    s.forEach(m => console.log(m));
    //console.log(c);
}

export async function deadGalleries(file: string) {
    const rows = await pg.select('id', 'url').table('gallery');
    let str = "";
    let doneCount = 0;

    for (let i = 0; i < rows.length; i++) {
        if (rows[i].url.includes("exhentai.org/g") || rows[i].url.includes("e-hentai.org/g")) {
            await sleep(500);
            loadURL(rows[i].url);
            try {
                saveTags(rows[i].id)
                continue;
            } catch (e) { }
        }
        str += rows[i].id + ',' + rows[i].url + "\n";
        logUpdate((doneCount++).toString());
    }
    logUpdate.done();
    fs.writeFile(file, str, (err) => {
        if (err) {
            return console.log(err);
        }
        console.log("Missing galleries written in " + file);
    });
}
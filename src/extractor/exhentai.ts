import _ from 'lodash';
import fs from 'fs';
import gm from 'gm';
import path from 'path';
import UserAgent from 'user-agents';
import axios from 'axios'
import cheerio from 'cheerio';
import validUrl from 'valid-url';
import { insertGallery, insertTag, insertGalleryTag, insertPage, pg, insertTask, TaskStatus } from '@database';
import logger from '@logger';

async function doRequest(url: string) {
    const userAgent = new UserAgent(/Chrome/);

    const resp = await axios.get(url, {
        withCredentials: true,
        headers: {
            Cookie: "ipb_member_id=1495002; ipb_pass_hash=2079431695aa1a8d681ddf1f91a4a22a;",
            UserAgent: userAgent
        }
    })
    return resp;
}

async function requestImage(url: string) {
    const userAgent = new UserAgent(/Chrome/);

    const resp = await axios.get(url, {
        responseType: "stream",
        withCredentials: true,
        headers: {
            Cookie: "ipb_member_id=1495002; ipb_pass_hash=2079431695aa1a8d681ddf1f91a4a22a;",
            UserAgent: userAgent
        }
    })
    return resp;
}

export async function loadURL(url: string) {
    const resp = await doRequest(url);
    return cheerio.load(resp.data);
}

function title(dom: CheerioStatic) {
    return dom("#gd2 #gn").text();
}

function category(dom: CheerioStatic) {
    return dom("#gdc").text();
}

function originalTitle(dom: CheerioStatic) {
    return dom("#gd2 #gj").text();
}

function length(dom: CheerioStatic) {
    const table = dom("#gdd table");
    const value = table.find("tr").eq(5).children(".gdt2").text();
    return Number(value.split(' ')[0]);
}

function groupedTags(dom: CheerioStatic) {
    const table = dom("#taglist table");
    const rows = table.find("tr");
    const result: { [k: string]: string[] } = {}
    rows.each((i, tr) => {
        const group = dom(tr.children[0]).text().slice(0, -1);
        result[group] = []
        tr.lastChild.children.forEach(el => {
            const tag = dom(el).text()
            result[group].push(tag);
        })
    })
    return result;
}

function pageNumber(dom: CheerioStatic) {
    return Number(dom("#i2 div.sn div span").text())
}

function imageURL(dom: CheerioStatic) {
    const original = dom("#i7");
    const a = original.find("a");
    if (a.length > 0) {
        return a.attr('href');
    }
    return dom("#i3 img").attr("src");
}

function dir(url: string) {
    const pattern = /\/g\/([\d\w]+)\/([\d\w]+)/
    const matches = url.match(pattern);
    if (matches == null || matches.length < 3) {
        throw new Error("Could not parse gallery dir")
    }
    return `${matches[1]}.${matches[2]}`;
}

function pageURL(dom: CheerioStatic, pageNumber: number) {
    const pagesElement = dom('#gdt')
    const pagesPerChapter = pagesElement.children().length - 1;
    let pagePosition = pageNumber % pagesPerChapter;

    if (pagePosition === 0) {
        pagePosition = pagesElement.children().length - 1;
    }
    const element = pagesElement.children().eq(pagePosition - 1);
    const a = element.children().first();
    if (a.length === 0) {
        throw new Error(`Could not find page number [${pageNumber}]`);
    }
    return a.attr('href');
}

function nextPageURL(dom: CheerioStatic) {
    return dom("#i3 a").attr("href");
}

export async function downloadImage(url: string, dir: string): Promise<string> {
    const response = await requestImage(url);
    let filename: string;
    if (url.includes("fullimg.php")) {
        const matches = response.headers['content-disposition'].match(/filename=(.*)$/);
        if (matches == null) {
            throw new Error(`Could not find filename for [${url}]`);
        }
        filename = matches[1];
    }
    else {
        filename = _.last(url.split('/')) || "";
    }
    const imagePath = path.join(process.env.VAULT_PATH!, dir);
    fs.mkdirSync(imagePath, { recursive: true })
    return new Promise((resolve, reject) => {
        const fullPath = path.join(imagePath, filename);
        const file = fs.createWriteStream(fullPath);
        response.data.pipe(file);
        file.on("finish", () => {
            const stats = fs.statSync(fullPath);
            if (stats["size"] === Number(response.headers['content-length']) && isValidImage(fullPath)) {
                resolve(filename);
            }
            else {
                reject(false);
            }
        });
    });
}

export async function saveTags(dom: CheerioStatic, galleryId: string) {
    const groups = groupedTags(dom);
    if (groups === {}) {
        throw new Error("No tags found for gallery " + galleryId);
    }
    for (const [group, tags] of Object.entries(groups)) {
        await Promise.all(tags.map(async name => {
            const tagId = await insertTag({ group, name });
            await insertGalleryTag(galleryId, tagId);
        }))
    }
}

async function saveGallery(dom: CheerioStatic, url: string) {
    const gallery: GalleryInsert = {
        url,
        dir: dir(url),
        title: title(dom),
        original_title: originalTitle(dom),
        length: length(dom),
        category: category(dom),
        hidden: false
    }
    const galleryId = await insertGallery(gallery);
    saveTags(dom, galleryId);
    return [galleryId, gallery.dir, gallery.length.toString()]
}

export async function pageExists(galleryId: string, pageNumber: number) {
    const query = 'SELECT g.dir, p.filename FROM gallery g JOIN page p ON g.id = p.id_gallery WHERE id_gallery = ? AND page_number = ?;';
    try {
        const { dir, filename } = (await pg.raw(query, [galleryId, pageNumber])).rows[0];
        const filepath = path.join(process.env.VAULT_PATH!, dir, filename);
        return isValidImage(filepath);
    } catch {
        return false;
    }
}

async function downloadPage(dom: CheerioStatic, idGallery: string, pageNumber: number, dir: string) {
    try {
        if (!(await pageExists(idGallery, pageNumber))) {
            const filename = await downloadImage(imageURL(dom), dir);
            await insertPage({
                id_gallery: idGallery,
                page_number: pageNumber,
                filename
            })
            logger.debug(`Downloaded page ${pageNumber}`)

        }
        else {
            logger.debug(`Skipped page ${pageNumber}`)
        }
    } catch (e) {
        if (e === false) {
            logger.error(`Failed downloading page [${pageNumber}].`);
            return;
        }
        else {
            throw e;
        }
    }
}

export async function downloadGalleryAsync(url: string, metadataOnly = false, force = false) {
    try {
        if (!validUrl.isWebUri(url)) {
            logger.info(`Rejected URL [${url}]. Doing nothing.`);
            return;
        }
        logger.info(`Accepted URL [${url}]. Dispatching task.`);
        const dom = await loadURL(url);
        const [idGallery, dir, length] = await saveGallery(dom, url);
        await insertTask({ id_gallery: idGallery, status: TaskStatus.RUNNING });
        if (metadataOnly) {
            return;
        }
        let pageNumber = 1;
        let currentURL = pageURL(dom, pageNumber);
        while (true) {
            const pageDom = await loadURL(currentURL);
            await downloadPage(pageDom, idGallery, pageNumber, dir);
            logger.verbose(`Done page ${pageNumber}/${length}`)
            const nextURL = nextPageURL(pageDom);
            if (nextURL.length === 0 || nextURL === currentURL) {
                break;
            }
            pageNumber++;
            currentURL = nextURL;
            setTimeout(() => { }, 2000);
        }
        logger.info(`Task [${url}] done.`);
    } catch (err) {
        logger.error(err);
    }
}

export function downloadGallery(url: string, metadataOnly = false) {
    downloadGalleryAsync(url, metadataOnly);
}

export async function isValidImage(filepath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filepath)) {
            gm(filepath).identify(result => {
                resolve(result === null);
            })
        }
        else {
            resolve(false)
        }
    });
}
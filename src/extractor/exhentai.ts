import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import UserAgent from 'user-agents';
import axios from 'axios'
import cheerio from 'cheerio';
import { insertGallery, insertTag, insertGalleryTag, insertPage } from '@database';

let dom: CheerioStatic;

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
    dom = cheerio.load(resp.data);
}

function title() {
    return dom("#gd2 #gn").text();
}

function category() {
    return dom("#gdc").text();
}

function originalTitle() {
    return dom("#gd2 #gj").text();
}

function length() {
    const table = dom("#gdd table");
    const value = table.find("tr").eq(5).children(".gdt2").text();
    return Number(value.split(' ')[0]);
}

function groupedTags() {
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

function pageNumber() {
    return Number(dom("#i2 div.sn div span").text())
}

function imageURL() {
    const original = dom("#i7");
    if (original.length > 0) {
        return original.find("a").attr('href');
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

function pageURL(pageNumber: number) {
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

function nextPageURL() {
    return dom("#i3 a").attr("href");
}

export async function downloadImage(url: string, page: number, dir: string): Promise<string> {
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
    const imagePath = path.join(process.env.VAULT_PATH!, dir, 'gallery');
    fs.mkdirSync(imagePath, { recursive: true })
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path.join(imagePath, filename));
        response.data.pipe(file);
        file.on("finish", () => resolve(filename));
    });
}

async function saveGallery(url: string) {
    await loadURL(url);
    const gallery: GalleryInsert = {
        url,
        dir: dir(url),
        title: title(),
        original_title: originalTitle(),
        length: length(),
        category: category(),
        hidden: false
    }
    const galleryId = await insertGallery(gallery);
    for (const [group, tags] of Object.entries(groupedTags())) {
        await Promise.all(tags.map(async name => {
            const tagId = await insertTag({ group, name });
            await insertGalleryTag(galleryId, tagId);
        }))
    }
    return [galleryId, gallery.dir]
}

export async function downloadGallery(url: string, metadataOnly = false) {
    const [galleryId, dir] = await saveGallery(url);
    if (metadataOnly) {
        return;
    }
    console.log(dir);
    let pageNumber = 1;
    let currentURL = pageURL(pageNumber);
    while (true) {
        await loadURL(currentURL);
        const filename = await downloadImage(imageURL(), pageNumber++, dir);
        await insertPage({
            id_gallery: Number(galleryId),
            page_number: pageNumber,
            filename
        })
        const nextURL = nextPageURL();
        if (nextURL.length === 0 || nextURL === currentURL) {
            break;
        }
        currentURL = nextURL;
        setTimeout(() => { }, 2000);
    }

}
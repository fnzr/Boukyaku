import test from 'ava';
import { convertGalleries, exportPages } from './src/legacy';
import { listGalleriesLegacy, insertGallery } from './src/database';
import { loadURL, downloadGallery, downloadImage } from '@extractor/exhentai';

test("tst", async t => {
    //await convertGalleries();
    ///const r = await listGalleriesLegacy();
    //await convertGalleries();
    //await loadURL("https://exhentai.org/g/1085821/d784b378b5/");
    //console.log(pageURL(1));
    await downloadGallery("https://exhentai.org/g/1085821/d784b378b5/")
    //console.log(await downloadGallery("http://70.71.115.9:1024/h/1a9dfb2fca9de25512c06fc2d1eb16bb3cdf8ea3-505733-1280-1808-jpg/keystamp=1569933000-cd304f2bfd;fileindex=39608569;xres=1280/datenshi_001.jpg", 1, "a"))
    //await downloadGallery("https://exhentai.org/g/1085821/d784b378b5/");
    //console.log(r)
    /*
    await insertGallery({
        dir: 'a',
        title: 'c',
        original_title: 'b',
        length: 2,
        hidden: false,
        hidden_reason: '',
        category: 'non-h',
        url: 'https://'
    })
    */
})
import { listGalleriesLegacy, insertGallery, pgLegacy, pg } from "@database";

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
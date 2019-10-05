import knex from 'knex';

export const pg = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL
});

export const pgLegacy = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL_LEGACY,
});

export async function listGalleriesLegacy() {
    const result = await pgLegacy.select().table('gallery');
    return result;

}

export async function insertGallery(g: GalleryInsert): Promise<string> {
    return (await pg('gallery').insert(g).returning('id'))[0];
}

export async function insertTag(t: Tag): Promise<string> {
    const insert = pg('tag').insert(t).toString();
    const query = `${insert} ON CONFLICT("group", "name") DO UPDATE SET "name"=excluded.name RETURNING "id"`;
    return (await pg.raw(query)).rows[0].id
}

export async function insertGalleryTag(galleryId: string, tagId: string) {
    const insert = pg('gallery_tag').insert({ id_gallery: galleryId, id_tag: tagId }).toString();
    const query = `${insert} ON CONFLICT DO NOTHING`;
    return pg.raw(query);
}

export async function insertPage(p: Page) {
    const insert = pg('page').insert(p).toString();
    const query = `${insert} ON CONFLICT DO NOTHING`;
    return pg.raw(query);
}

export async function listCovers(offset: number, limit: number) {
    return pg.raw("SELECT g.title, CONCAT('/thumbs/', g.dir, '.', p.page_number) as url, g.category, g.length FROM gallery g JOIN page p ON g.id = p.id_gallery WHERE p.page_number = 1 ORDER BY created DESC LIMIT ? OFFSET ?;", [limit, offset])
}

export async function countGalleries(filter: string) {
    return pg("gallery").count("id");
}

export async function getFilename(dir: string, page: number) {
    return pg.raw("SELECT filename FROM page p JOIN gallery g ON p.id_gallery = g.id WHERE p.page_number = ? AND g.dir = ?;", [page, dir])
}
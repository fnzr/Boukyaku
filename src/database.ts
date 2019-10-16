import knex from 'knex';
import logger from '@logger';
/** List galleries with mismatched length/pages
select p.id_gallery, g.length, count(*), count(*) - g.length
from page p join gallery g on (g.id = p.id_gallery)
group by p.id_gallery, g.length
having (count(*) <> g.length)
**/

export enum TaskStatus {
    RUNNING = 'RUNNING',
    STOPPED = 'STOPPED',
    COMPLETED = 'COMPLETED'
}

export const pg = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    log: {
        error(message: string) {
            logger.error(message);
        }
    }
});
pg.on('query', (queryData: knex.Sql) => {
    if (process.env.DEBUG_SQL === 'true') {
        logger.debug(queryData.sql);
    }
})

export const pgLegacy = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL_LEGACY,
});

export async function listGalleriesLegacy() {
    const result = await pgLegacy.select().table('gallery');
    return result;

}

export async function insertGallery(g: GalleryInsert): Promise<string> {
    const insert = pg('gallery').insert(g).toString();
    const query = `${insert} ON CONFLICT("dir") DO UPDATE SET updated = NOW() RETURNING id`;
    return (await pg.raw(query)).rows[0].id
}

export async function insertTask(t: { id_gallery: string, status: TaskStatus }) {
    return pg('task').insert({
        ...t,
        failed_pages: [],
        messages: []
    })
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
    return pg.raw("SELECT g.title, CONCAT(g.dir, '/', p.filename) as path, g.category, g.length FROM gallery g JOIN page p ON g.id = p.id_gallery WHERE p.page_number = 1 ORDER BY created DESC LIMIT ? OFFSET ?;", [limit, offset])
}

export async function countGalleries(filter: string) {
    return pg("gallery").count("id");
}

export async function getFilename(dir: string, page: number) {
    return pg.raw("SELECT filename FROM page p JOIN gallery g ON p.id_gallery = g.id WHERE p.page_number = ? AND g.dir = ?;", [page, dir])
}
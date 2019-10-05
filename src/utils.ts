import path from 'path';
import { getFilename } from '@database';

export async function getPath(dir: string, page: number, thumbnail = false) {
    let result: string
    if (thumbnail) {
        result = path.join(process.env.VAULT_PATH!, 'thumbs', `${dir}.${page}`);
    }
    else {
        const filename = (await getFilename(dir, page)).rows[0].filename;
        result = path.join(process.env.VAULT_PATH!, dir, 'gallery', filename);
    }
    return result;
}
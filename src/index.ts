require('dotenv').config()
import sharp from 'sharp';
import fs from 'fs';
import express, { Request, Response } from 'express';
import { listCovers, countGalleries, getFilename } from '@database';
import { getPath } from '@utils';

const app = express()

app.use(express.json())
app.use('/vault', express.static(process.env.VAULT_PATH!))

app.get('/', (req: Request, res: Response) => res.send('Hello World!'))

app.get('/thumbs/:dir.:page', async (req: Request, res: Response) => {
    const dir = req.params.dir;
    const page = Number(req.params.page);
    const thumbFile = await getPath(dir, page, true);
    if (!fs.existsSync(thumbFile)) {
        const file = await getPath(dir, page);
        try {
            await sharp(file).resize(null, 285, { fit: "inside" }).toFile(thumbFile)
        }
        catch (e) {
            console.log(file);
        }
    }
    res.sendFile(thumbFile, {
        headers: {
            "content-type": "image/jpeg"
        }
    });
})

app.post('/covers', async (req: Request, res: Response) => {
    const offset = "offset" in req.body ? req.body["offset"] : 0;
    const limit = "limit" in req.body ? req.body["limit"] : 100;

    const rows = (await listCovers(offset, limit)).rows

    res.json(rows)
})

app.post('/countGalleries', async (req: Request, res: Response) => {
    const count = (await countGalleries(""))[0]
    res.json(count)
})

app.listen(3000, () => console.log("Listen or port " + 3000));
require('dotenv').config()
import validUrl from 'valid-url';
import express, { Request, Response } from 'express';
import { listCovers, countGalleries } from '@database';
import { downloadGallery } from '@extractor/exhentai';
import logger from '@logger';
import proxy from 'express-http-proxy';

function startServer(port?: number) {
    const app = express()

    app.use(express.json())

    app.use('/vault/:gallery/:filename$',
        proxy(process.env.VAULT_URL!, {
            proxyReqPathResolver: req => {
                const g = req.params.gallery;
                const f = req.params.filename;
                return `/${g}/${f}`;
            }
        })
    )

    app.use('/vault/:options/:gallery/:filename',
        proxy(process.env.IMAGEPROXY_URL!, {
            proxyReqPathResolver: req => {
                const g = req.params.gallery;
                const f = req.params.filename;
                const o = req.params.options;
                return `/${o}/${process.env.VAULT_URL!}/${g}/${f}`;
            }
        })
    )

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

    app.post('/downloadGallery', async (req: Request, res: Response) => {
        downloadGallery(req.body['url']);
        res.json("ok")
    })

    if (port === undefined) {
        port = Number(process.env.SERVER_PORT!);
    }
    app.listen(port, () => logger.info("Listening or port " + port));
}

export default startServer;
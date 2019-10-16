import yargs from 'yargs';
import startServer from "@server";
import { downloadGalleryAsync, downloadImage, isValidImage, pageExists } from "@extractor/exhentai"
import maintanance from '@maintanance';
import fs from 'fs';
import { pg } from '@database';

async function test() {
    //await maintanance.removeDuplicateFiles();
    //const r = await maintanance.missingFilesOnDisk();
    //fs.writeFileSync("out.txt", r.join("\n"));
    //const rows = (await pg.raw("SELECT g.dir, g.id FROM gallery g")).rows;
    //console.log(rows)
    await maintanance.fixPagesOnDatabase();
    //console.log(r.length);
}

// tslint:disable-next-line: no-unused-expression
yargs
    .command('serve [port]', 'Start server', (yargs) => {
        return yargs.option('port', {
            alias: 'p',
            type: 'number'
        })
    }, argv => startServer(argv.port))
    .command('download <url>', 'Downloads gallery', yargs => {
        return yargs.positional('url', {
            describe: 'Gallery to download',
            type: 'string',
            demandOption: "true"
        })
    }, argv => downloadGalleryAsync(argv.url))
    .command('test', 'Test custom function', () => { }, async () => {
        await test();
        process.exit();
    })
    .help().argv
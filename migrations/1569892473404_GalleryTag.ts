/* eslint-disable @typescript-eslint/camelcase */
import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('gallery_tag', {
        id_gallery: {
            type: 'int',
            primaryKey: true,
            references: 'gallery'
        },
        id_tag: {
            type: 'int',
            primaryKey: true,
            references: 'tag'
        }
    })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('gallery_tag');
}

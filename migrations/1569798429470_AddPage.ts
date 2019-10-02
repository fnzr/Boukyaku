/* eslint-disable @typescript-eslint/camelcase */
import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('page', {
        id_gallery: {
            type: 'int',
            references: '"gallery"',
            primaryKey: true
        },
        page_number: {
            type: 'int',
            primaryKey: true
        },
        filename: {
            type: 'text',
            notNull: true
        }
    })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('page');
}

/* eslint-disable @typescript-eslint/camelcase */
import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('tag', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        name: {
            type: 'text',
        },
        group: {
            type: 'text',
        }
    })
    pgm.createIndex('tag', ['name', 'group'], {
        unique: true
    })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('tag', ['name', 'group']);
    pgm.dropTable('tag');
}

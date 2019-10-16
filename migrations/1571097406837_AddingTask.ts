/* eslint-disable @typescript-eslint/camelcase */
import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('task', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        id_gallery: {
            type: 'int'
        },
        status: {
            type: 'text'
        },
        errors: {
            type: 'integer[]'
        },
        created: {
            type: 'timestamp',
            default: pgm.func('NOW()')
        }
    })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('task');
}

/* eslint-disable @typescript-eslint/camelcase */
import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.addColumn('task', {
        messages: {
            type: 'text[]'
        }
    })
    pgm.renameColumn('task', 'errors', 'failed_pages')
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropColumn('task', 'messages');
    pgm.renameColumn('task', 'failed_pages', 'errors')
}

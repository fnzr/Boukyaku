import { MigrationBuilder } from "node-pg-migrate"

exports.shorthands = undefined;

exports.up = (pgm: MigrationBuilder) => {
    pgm.createTable('gallery', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        dir: {
            type: 'text',
            unique: true
        },
        title: {
            type: 'text'
        },
        original_title: {
            type: 'text'
        },
        length: {
            type: 'int'
        },
        hidden: {
            type: 'boolean',
            default: false
        },
        hidden_reason: {
            type: 'text'
        },
        category: {
            type: 'text'
        },
        url: {
            type: 'text'
        },
        created: {
            type: 'timestamp',
            default: pgm.func('NOW()')
        },
        updated: {
            type: 'timestamp',
            default: pgm.func('NOW()')
        }
    })
};

exports.down = (pgm: MigrationBuilder) => {
    pgm.dropTable('gallery')
};

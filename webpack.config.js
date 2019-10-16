const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const {
    NODE_ENV = 'development',
} = process.env;
module.exports = {
    entry: './src/index.ts',
    mode: NODE_ENV,
    devtool: 'source-map',
    target: 'node',
    externals: [nodeExternals()],
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'index.js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        plugins: [
            new TsconfigPathsPlugin()
        ]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    'ts-loader',
                ]
            }
        ]
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },

}
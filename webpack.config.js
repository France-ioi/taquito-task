const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'taquito-task.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js', '.mjs'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                // The ECAD Beacon WalletConnect transport pulls in ESM (.mjs)
                // deps (unstorage, @walletconnect/*) that use extensionless
                // imports; allow webpack to resolve them.
                test: /\.m?js$/,
                resolve: { fullySpecified: false },
            },
        ],
    },
    plugins: [
        new NodePolyfillPlugin(),
        // The ECAD Beacon / WalletConnect modules reference bare `process` and
        // `Buffer`; inject them so they're defined at runtime in the browser.
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
    ],
    // unstorage / @walletconnect break webpack's module concatenation
    // ("Cannot read properties of undefined (reading 'module')"); disable it.
    optimization: {
        concatenateModules: false,
    },
    mode: 'production',
/*    resolve: {
        fallback: {
            console: false,
            process: require.resolve('process/browser'),
        }
    }*/
};
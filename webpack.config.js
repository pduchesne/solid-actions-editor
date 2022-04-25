const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');

var path = require('path');

const APP_NAME = 'solid-actions-editor';

// this will create index.html file containing script
// source in dist folder dynamically
const htmlPlugin = new HtmlWebPackPlugin({
    template: './src/index.html',
    filename: './index.html',
    inject: 'body',
    chunks: [APP_NAME],
});

var localVariables;
try {
    localVariables = require('./local-config.json');
} catch (e) {}
const definePlugin = new webpack.DefinePlugin({
    process: {env: {}, browser: true},
    PROXY_URL: (localVariables && JSON.stringify(localVariables.proxyUrl)) || false
});

const dev = true;

var styleLoader = 'style-loader';
var cssLoader =  'css-loader';


module.exports = {
    mode: dev ? 'development' : 'production',
    optimization: { minimize: !dev },

    //specify the entry point for your project
    entry: { [APP_NAME] : [ './src/index.tsx' ] },
    // specify the output file name
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app/index.js',
        //publicPath: '/',
        libraryTarget: 'umd',
        umdNamedDefine: true

    },
    resolve: {
        // this is required to be able to do non relative imports of src code
        modules: [path.resolve('./src'), path.resolve('./node_modules')],
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'],
        fallback: {
            util: false,
            buffer:  require.resolve("buffer/")
        },
    },
    target: 'web',
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'ts-loader'
            },
            {
                test: /\.css$/,
                use: [styleLoader, cssLoader]
            },

            {
                test: /\.scss$/,
                use: [styleLoader, cssLoader, 'sass-loader']
            },
           // { test: /\.json$/, loader: "json-loader" },
            { // required for font-awesome
                test: /\.(jpe?g|png|gif|svg|ico|woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                loader: "file-loader",
                options: {
                    outputPath: 'assets/',
                    name: '[name].[ext]'
                }
            },
        ]
    },
    // this will create a development server to host our application
    // and will also provide live reload functionality
    devServer: {
        host: '0.0.0.0',
      static: {
        directory: path.join(__dirname, 'dist'),
      },
        compress: true,
        port: 8000,
        // needed to properly support BrowsrRouter
        // see https://stackoverflow.com/questions/43209666/react-router-v4-cannot-get-url
        historyApiFallback: {
          disableDotRule: true,
        },
        https: true,
    },

    // this will watch the bundle for any changes
    //watch: true,
    // specify the plugins which you are using
    plugins: [
        htmlPlugin,
        definePlugin
    ]
};

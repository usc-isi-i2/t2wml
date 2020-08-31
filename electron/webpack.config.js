/* eslint-disable */
const lodash = require('lodash');
const CopyPkgJsonPlugin = require('copy-pkg-json-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

function srcPaths(src) {
  return path.join(__dirname, src);
}

const isEnvProduction = process.env.NODE_ENV === 'production';
const isEnvDevelopment = process.env.NODE_ENV === 'development';

// #region Common settings
const commonConfig = {
  devtool: isEnvDevelopment ? 'source-map' : false,
  mode: isEnvProduction ? 'production' : 'development',
  output: { path: srcPaths('dist') },
  node: { __dirname: false, __filename: false },
  resolve: {
    alias: {
      '@': srcPaths('src'),
      '@main': srcPaths('src/main'),
      '@models': srcPaths('src/models'),
      '@public': srcPaths('public'),
      '@renderer': srcPaths('src/renderer'),
      '@utils': srcPaths('src/utils'),
    },
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.(scss|css)$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|png|svg|ico|icns|ttf)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
          outputPath: 'images',
        },
      },
    ],
  },
};
// #endregion

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const mainConfig = lodash.cloneDeep(commonConfig);
mainConfig.entry = './src/main/main.ts';
mainConfig.target = 'electron-main';
mainConfig.output.filename = 'main.bundle.js';
mainConfig.plugins = [
  new CopyPkgJsonPlugin({
    remove: ['scripts', 'devDependencies', 'build'],
    replace: {
      main: './main.bundle.js',
      scripts: { start: 'electron ./main.bundle.js' },
      postinstall: 'electron-builder install-app-deps',
    },
  }),
  new ForkTsCheckerWebpackPlugin({
    eslint: {
      files: './src/**/*.{ts,tsx,js,jsx}' // required - same as command `eslint ./src/**/*.{ts,tsx,js,jsx} --ext .ts,.tsx,.js,.jsx`
    }
  })];

const rendererConfig = lodash.cloneDeep(commonConfig);
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
rendererConfig.entry = './src/renderer/index.tsx';
rendererConfig.target = 'electron-renderer';
rendererConfig.output.filename = 'renderer.bundle.js';
rendererConfig.plugins = [
  new MonacoWebpackPlugin({
    languages: ['yaml']
  }),
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, './public/index.html'),
  }),
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, './public/splash.html'),
    filename: 'splash.html',
  }),
  new ForkTsCheckerWebpackPlugin({
    eslint: {
      files: './src/**/*.{ts,tsx,js,jsx}', // required - same as command `eslint ./src/**/*.{ts,tsx,js,jsx} --ext .ts,.tsx,.js,.jsx`
      formatter: 'basic',
    }
  })
];

module.exports = [mainConfig, rendererConfig];

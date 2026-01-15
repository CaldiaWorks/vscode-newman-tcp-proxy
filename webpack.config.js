const path = require('path');



const webviewConfig = {
  name: 'webview',
  mode: 'development', // 'production' for release (will be overridden by CLI flag)
  entry: './src/webview/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webview.js',
  },
  devtool: 'nosources-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webview.json',
              transpileOnly: true
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  performance: {
    hints: false,
  },
};

const extensionConfig = {
  name: 'extension',
  target: 'node',
  mode: 'development', // 'production' for release
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs',
  },
  externals: {
    vscode: 'commonjs vscode', // Important!
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
                transpileOnly: true 
            }
          },
        ],
      },
    ],
  },
  devtool: 'nosources-source-map',
};

module.exports = [webviewConfig, extensionConfig];

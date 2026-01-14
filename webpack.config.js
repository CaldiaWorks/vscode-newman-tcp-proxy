const path = require('path');

module.exports = {
  mode: 'development', // 'production' for release
  entry: './src/webview/index.tsx',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'webview.js',
  },
  devtool: 'inline-source-map',
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

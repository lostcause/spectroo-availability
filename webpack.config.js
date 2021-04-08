const path = require('path');
const pkg = require('./package.json');
module.exports = {
    entry: "./src/SpectrooAvailability.js",
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: "index.js",
      library: pkg.name,
      libraryTarget: "commonjs2"
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: { 
              presets: ['@babel/preset-env', '@babel/react'],
              plugins:['@babel/plugin-proposal-class-properties']
            }
          }
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"]
        },
        {
          test: /\.(png|jpg|gif)$/i,
          use: {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        }
      ]
    }
};

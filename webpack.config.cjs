// webpack.config.cjs

const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  mode: "production",
  entry: "./index.cjs",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.cjs",
    libraryTarget: "commonjs2",
  },
  target: "node",
  resolve: {
    extensions: [".js", ".cjs"],
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.cjs$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};

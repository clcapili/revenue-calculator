const path = require('path');

module.exports = {
    name: 'cc',
    mode: 'development', // production / development
    entry: './src/js/main.js',
    output: {
        path: path.resolve(__dirname, 'wordpress/wp-content/themes/cc/js'),
        filename: 'site.js',
        libraryTarget: 'var',
        library: 'CC',
    },
    module: {
        rules: [
            {
                // for any file with a suffix of js or jsx
                test: /\.js$/,

                // ignore transpiling JavaScript from node_modules as it should be that state
                exclude: /node_modules/,

                // use the babel-loader for transpiling JavaScript to a suitable format
                loader: 'babel-loader',

                options: {
                    // attach the presets to the loader (most projects use .babelrc file instead)
                    presets: ["@babel/preset-env"]
                }
            },
        ],
    },
    optimization: {
        concatenateModules: true,
        minimize: true
    }
};
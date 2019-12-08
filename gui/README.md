# T2WML-GUI

GUI of [T2WML: A Cell-Based Language To Map Tables Into Wikidata Records](https://github.com/usc-isi-i2/t2wml)

> This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Prerequisites

* [node>=8.1 & npm>=6](https://nodejs.org/en/)

## Before Development/Deployment

1. Run `cd gui` (skip if you are already in `gun` folder).
2. Run `npm install` to install dependencies.
3. Configs:
    * `/t2wml-gui/src/config.js`
    * `/t2wml-gui/src/privacy.js`

## Development

4. Run `npm start` for local development.

## Deployment

4. Run `npm run build` to build this app in `/gui/build`.
5. Move all files in `/gui/build` to backend:
    * Manually
        * Move all `*.html` to [`/t2wml/templates`](https://github.com/usc-isi-i2/t2wml/tree/master/templates).
        * Move other files to [`/t2wml/t2wml-gui`](https://github.com/usc-isi-i2/t2wml/tree/master/t2wml-gui).
    * Automatically *(by default)*
        * Update [`/t2wml-gui/package.json`](https://github.com/JiashengWu/t2wml-gui/blob/master/package.json) as
            ```
            {
                ...,
                "scripts": {
                    ...,
                    "build": "node scripts/build.js && sh deploy.sh",
                    ...
                },
                ...
            }
            ```
        * Then [`/t2wml-gui/deploy.sh`](https://github.com/JiashengWu/t2wml-gui/blob/master/deploy.sh) would be called automatically after `npm run build`. (You might need to change the parameters of paths in this script.)

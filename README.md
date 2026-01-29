# Obsidian Dist

This plugin allows you to **distribute your Obsidian vault as a static HTML website**.

It generates a standalone website mirroring your vault's structure, converting Markdown notes to HTML, and applying your current Obsidian theme's colors and fonts.

## Features
- **Static Site Generation**: Converts all your notes to HTML files.
- **Style Replicaton**: Inherits your vault's accent color and custom font (via Google Fonts).
- **Navigation Tree**: Generates a sidebar navigation matching your folder structure.
- **Internal Links**: Preserves links between notes.

## Based on
This project is based on the [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

## How to use

1. Go to **Settings > Obsidian Dist**.
2. Set your desired **Output Directory** (default: `dist`).
3. Click **Generate Now**.
4. Open the `index.html` (or `Welcome.html`) in your output folder to view your site.

## Development

- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.
- `npm run build` to build for production.

## Author
**Rafafields**

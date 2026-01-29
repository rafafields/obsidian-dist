import { App, Component, MarkdownRenderer, Notice, TFile, TFolder, FileSystemAdapter, TAbstractFile } from 'obsidian';
import { MyPluginSettings } from './settings';
import * as path from 'path';
import * as fs from 'fs';

interface NavItem {
    name: string;
    path: string;
    isFolder: boolean;
    children?: NavItem[];
}

export class StaticSiteGenerator {
    app: App;
    settings: MyPluginSettings;
    adapter: FileSystemAdapter;
    navTree: NavItem[];

    constructor(app: App, settings: MyPluginSettings) {
        this.app = app;
        this.settings = settings;
        this.adapter = app.vault.adapter as FileSystemAdapter;
    }

    async generate() {
        new Notice('Starting static site generation...');

        const outputDir = path.join(this.adapter.getBasePath(), this.settings.outputDir);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 1. Build Navigation Tree
        this.navTree = this.buildNavTree(this.app.vault.getRoot());

        // 2. Export Styles
        await this.exportStyles(outputDir);

        // 3. Process Files
        const files = this.app.vault.getFiles();
        const markdownFiles = files.filter(f => f.extension === 'md');
        const assetFiles = files.filter(f => f.extension !== 'md');

        // Copy Assets
        for (const file of assetFiles) {
            await this.copyFile(file, outputDir);
        }

        // Process Markdown
        let processed = 0;
        for (const file of markdownFiles) {
            await this.processMarkdown(file, outputDir);
            processed++;
            if (processed % 10 === 0) {
                new Notice(`Processed ${processed}/${markdownFiles.length} files...`, 1000);
            }
        }

        new Notice('Static site generation complete!');
    }

    buildNavTree(folder: TFolder): NavItem[] {
        const items: NavItem[] = [];

        for (const child of folder.children) {
            // Skip hidden files/folders and output dir
            if (child.name.startsWith('.')) continue;
            if (child.name === this.settings.outputDir) continue;

            if (child instanceof TFolder) {
                items.push({
                    name: child.name,
                    path: child.path,
                    isFolder: true,
                    children: this.buildNavTree(child)
                });
            } else if (child instanceof TFile && child.extension === 'md') {
                items.push({
                    name: child.basename,
                    path: child.path,
                    isFolder: false
                });
            }
        }

        // Sort: Folders first, then alphabetically
        return items.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    generateNavHtml(items: NavItem[], currentPath: string): string {
        let html = '<ul>';
        for (const item of items) {
            html += '<li>';
            if (item.isFolder) {
                html += `<details open>
                    <summary>${item.name}</summary>
                    ${this.generateNavHtml(item.children || [], currentPath)}
                </details>`;
            } else {
                const targetPath = item.path.replace(/\.md$/, '.html');
                const relPath = this.getRelativePath(currentPath, targetPath);
                const isActive = item.path === currentPath ? 'class="active"' : '';
                html += `<a href="${relPath}" ${isActive}>${item.name}</a>`;
            }
            html += '</li>';
        }
        html += '</ul>';
        return html;
    }

    async exportStyles(outputDir: string) {
        const stylesDir = path.join(outputDir, 'assets');
        if (!fs.existsSync(stylesDir)) {
            fs.mkdirSync(stylesDir, { recursive: true });
        }

        // Read Appearance Config
        let accentColor = '';
        let font = '';
        try {
            // @ts-ignore - configDir is standard but sometimes missing in types
            const configPath = this.app.vault.configDir ? path.join(this.app.vault.configDir, 'appearance.json') : '.obsidian/appearance.json';
            if (await this.adapter.exists(configPath)) {
                const configStr = await this.adapter.read(configPath);
                const config = JSON.parse(configStr);
                accentColor = config.accentColor;
                font = config.textFontFamily || config.interfaceFontFamily;
            }
        } catch (e) {
            console.warn('Failed to read appearance config', e);
        }

        let fontImport = '';
        let rootOverrides = '';

        if (font) {
            // Try to validate/fetch Google Font
            const fontUrl = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
            try {
                const response = await fetch(fontUrl, { method: 'HEAD' });
                if (response.ok) {
                    fontImport = `@import url('${fontUrl}');\n`;
                    rootOverrides += `    --font-interface: "${font}", sans-serif;\n`;
                    rootOverrides += `    --font-text: "${font}", sans-serif;\n`;
                    rootOverrides += `    font-family: var(--font-text);\n`;
                }
            } catch (e) {
                console.warn('Failed to check Google Fonts', e);
            }
        }

        // if (accentColor) { // Moved to customCSS
        //     rootOverrides += `    --interactive-accent: ${accentColor};\n`;
        //     rootOverrides += `    --text-accent: ${accentColor};\n`;
        // }

        let baseCSS = '';
        const styleSheets = Array.from(document.styleSheets);
        for (const sheet of styleSheets) {
            try {
                if (sheet.href && !sheet.href.startsWith('app://')) { }
                for (const rule of Array.from(sheet.cssRules)) {
                    baseCSS += rule.cssText + '\n';
                }
            } catch (e) {
                console.warn('Could not access stylesheet rules', e);
            }
        }
        fs.writeFileSync(path.join(stylesDir, 'style.css'), baseCSS);

        const customCSS = `
/* Custom & Overrides CSS */
${fontImport}
:root, body {
    --sidebar-width: 250px;
    ${font ? `--font-interface: '${font}', sans-serif !important;` : ''}
    ${font ? `--font-text: '${font}', sans-serif !important;` : ''}
    ${accentColor ? `--interactive-accent: ${accentColor} !important;` : ''}
    ${accentColor ? `--text-accent: ${accentColor} !important;` : ''}
}
html, body { margin: 0; padding: 0; height: 100%; }
body {
    display: flex;
    font-family: var(--font-text) !important;
}
.app-container {
    display: flex;
    flex-direction: row !important;
    width: 100%;
    height: 100%;
}
aside.sidebar {
    width: var(--sidebar-width);
    height: 100vh;
    overflow-y: auto;
    border-right: 1px solid var(--background-modifier-border);
    padding: 10px;
    box-sizing: border-box;
    background-color: var(--background-secondary);
}
main.content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 50px;
    height: 100vh;
    box-sizing: border-box;
}
aside.sidebar ul { list-style: none; padding-left: 10px; margin: 0; }
aside.sidebar li { margin: 2px 0; }
aside.sidebar a { text-decoration: none; color: var(--text-normal); display: block; padding: 2px 5px; border-radius: 4px; }
aside.sidebar a:hover { background-color: color-mix(in srgb, var(--interactive-accent) 15%, transparent) !important; }
aside.sidebar a.active { background-color: var(--interactive-accent) !important; color: var(--text-on-accent) !important; }
aside.sidebar summary { cursor: pointer; color: var(--text-muted); font-weight: 600; padding: 4px 0; }
aside.sidebar summary:hover { color: var(--text-normal); }

/* Markdown Content adjustments */
.markdown-preview-view { width: 100%; }
h1.note-title { margin-top: 0; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 10px; }
`;
        fs.writeFileSync(path.join(stylesDir, 'custom.css'), customCSS);
    }

    async copyFile(file: TFile, outputDir: string) {
        const sourcePath = this.adapter.getFullPath(file.path);
        const destPath = path.join(outputDir, file.path);
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(sourcePath, destPath);
    }

    async processMarkdown(file: TFile, outputDir: string) {
        const content = await this.app.vault.read(file);
        const destPath = path.join(outputDir, file.path.replace(/\.md$/, '.html'));
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        const container = document.createElement('div');
        container.addClass('markdown-preview-view');
        container.addClass('markdown-rendered');
        document.body.classList.forEach(cls => container.addClass(cls));

        // Add Title
        const titleEl = document.createElement('h1');
        titleEl.addClass('note-title');
        titleEl.innerText = file.basename;
        container.appendChild(titleEl);

        await MarkdownRenderer.render(this.app, content, container, file.path, new Component());
        this.postProcessHtml(container, file.path);

        // Generate Nav
        const navHtml = this.generateNavHtml(this.navTree, file.path);

        const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>${file.basename}</title>
	<link rel="stylesheet" href="${this.getRelativePath(file.path, 'assets/style.css')}">
	<link rel="stylesheet" href="${this.getRelativePath(file.path, 'assets/custom.css')}">
</head>
<body class="${document.body.className}">
    <div class="app-container">
        <aside class="sidebar">
            <div class="nav-header">${this.app.vault.getName()}</div>
            ${navHtml}
        </aside>
        <main class="content">
            ${container.outerHTML}
        </main>
    </div>
</body>
</html>`;

        fs.writeFileSync(destPath, html);
    }

    postProcessHtml(container: HTMLElement, sourcePath: string) {
        const links = container.querySelectorAll('a.internal-link');
        links.forEach((link: HTMLAnchorElement) => {
            const linkText = link.getAttribute('data-href') || link.getAttribute('href');
            if (linkText) {
                const targetFile = this.app.metadataCache.getFirstLinkpathDest(linkText, sourcePath);
                if (targetFile) {
                    const targetPath = targetFile.extension === 'md'
                        ? targetFile.path.replace(/\.md$/, '.html')
                        : targetFile.path;
                    const relPath = this.getRelativePath(sourcePath, targetPath);
                    link.setAttribute('href', relPath);
                }
            }
        });
        // Images handling omitted for brevity as discussed
    }

    getRelativePath(from: string, to: string): string {
        const fromDir = path.dirname(from);
        return path.relative(fromDir, to).replace(/\\/g, '/');
    }
}

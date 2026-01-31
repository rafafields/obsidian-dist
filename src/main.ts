import { Plugin, TFolder, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { StaticSiteGenerator } from "./generator";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'generate-static-site',
			name: 'Generate Static Site',
			callback: async () => {
				await this.generate();
			}
		});

		this.addCommand({
			id: 'refresh-lock-icons',
			name: 'Debug: Refresh Lock Icons',
			callback: () => {
				this.refreshFileExplorerIcons();
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			// Small delay to ensure DOM is fully populated
			setTimeout(() => this.refreshFileExplorerIcons(), 1000);
		});

		this.registerEvent(this.app.vault.on('create', () => this.refreshFileExplorerIcons()));
		this.registerEvent(this.app.vault.on('delete', () => this.refreshFileExplorerIcons()));
		this.registerEvent(this.app.vault.on('rename', () => this.refreshFileExplorerIcons()));
	}

	async generate() {
		const generator = new StaticSiteGenerator(this.app, this);
		await generator.generate();
	}

	onunload() {
		this.removeLockIcons();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	refreshFileExplorerIcons() {
		// Clean up any previously hidden folders
		const hiddenElements = document.querySelectorAll('.obsidian-dist-hidden');
		hiddenElements.forEach(el => el.removeClass('obsidian-dist-hidden'));

		// Remove permanent locks to allow re-evaluation (important if settings change)
		const permanentLocks = document.querySelectorAll('.obsidian-dist-lock-icon.is-permanent');
		permanentLocks.forEach(el => el.remove());

		if (!this.settings.allowPrivateFolders) {
			this.removeLockIcons();
		}

		// Use DOM lookup which is more robust than internal fileItems API
		const rootFolder = this.app.vault.getRoot();
		const rootChildren = rootFolder.children;

		// Iterate over all file explorer leaves (usually just one)
		const leaves = this.app.workspace.getLeavesOfType('file-explorer');

		leaves.forEach(leaf => {
			const container = leaf.view.containerEl;

			// 1. Lock Icons Logic (User Configured)
			if (this.settings.allowPrivateFolders) {
				for (const child of rootChildren) {
					if (child instanceof TFolder) {
						// Skip output dir in this loop, it is handled separately
						if (child.path === this.settings.outputDir) continue;

						const titleEl = container.querySelector(`.nav-folder-title[data-path="${child.path.replace(/"/g, '\\"')}"]`);
						if (titleEl) {
							this.addLockIcon(titleEl as HTMLElement, child.path);
						}
					}
				}
			}

			// 2. Output Directory Logic (Permanent Lock)
			if (this.settings.outputDir) {
				// Search for the output directory folder
				const outDirEl = container.querySelector(`.nav-folder-title[data-path="${this.settings.outputDir.replace(/"/g, '\\"')}"]`);
				if (outDirEl) {
					// Add permanent lock icon
					this.addLockIcon(outDirEl as HTMLElement, this.settings.outputDir, true);
				}
			}
		});
	}

	addLockIcon(titleEl: HTMLElement, folderPath: string, isPermanent: boolean = false) {
		let lockIcon = titleEl.querySelector('.obsidian-dist-lock-icon');

		// If icon exists but mismatches desired 'permanent' state, remove it to re-create
		if (lockIcon) {
			const hasPerm = lockIcon.hasClass('is-permanent');
			if (hasPerm !== isPermanent) {
				lockIcon.remove();
				lockIcon = null;
			}
		}

		if (!lockIcon) {
			lockIcon = titleEl.createSpan({ cls: 'obsidian-dist-lock-icon' });
			setIcon(lockIcon as HTMLElement, 'lock');

			if (!isPermanent) {
				lockIcon.addEventListener('click', async (e) => {
					e.stopPropagation();
					e.preventDefault();
					await this.toggleLock(folderPath);
				});
			} else {
				// Prevent interaction for permanent locks
				lockIcon.addEventListener('click', (e) => {
					e.stopPropagation();
					e.preventDefault();
				});
			}
		}

		// Update Visual State
		if (isPermanent) {
			lockIcon.addClass('is-locked');
			lockIcon.addClass('is-permanent');
			(lockIcon as HTMLElement).ariaLabel = "Output Directory (Always Excluded)";
			return;
		}

		const isLocked = this.settings.lockedFolders.includes(folderPath);
		if (isLocked) {
			lockIcon.addClass('is-locked');
			(lockIcon as HTMLElement).ariaLabel = "Private Folder (Excluded from Dist)";
		} else {
			lockIcon.removeClass('is-locked');
			(lockIcon as HTMLElement).ariaLabel = "Mark as Private";
		}
	}

	removeLockIcons() {
		const icons = document.querySelectorAll('.obsidian-dist-lock-icon');
		icons.forEach(el => el.remove());
	}

	async toggleLock(path: string) {
		if (this.settings.lockedFolders.includes(path)) {
			// Remove path
			this.settings.lockedFolders = this.settings.lockedFolders.filter(p => p !== path);
		} else {
			// Add path
			this.settings.lockedFolders.push(path);
		}
		await this.saveSettings();
		this.refreshFileExplorerIcons();
	}
}

import { App, PluginSettingTab, Setting, TFile } from 'obsidian';
import MyPlugin from './main';
import { FileSuggestModal } from './suggest-modal';

export interface MyPluginSettings {
	outputDir: string;
	allowPrivateFolders: boolean;
	lockedFolders: string[];
	previousOutputDirs: string[];
	indexFile: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	outputDir: 'dist',
	allowPrivateFolders: false,
	lockedFolders: [],
	previousOutputDirs: [],
	indexFile: ''
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Entry Point Note')
			.setDesc('Select the note that will serve as the index.html for your site. Only notes in the root folder are allowed.')
			.addText(text => text
				.setPlaceholder('Select a file...')
				.setValue(this.plugin.settings.indexFile)
				.setDisabled(true))
			.addButton(button => button
				.setButtonText('Select Note')
				.onClick(() => {
					new FileSuggestModal(this.plugin.app, async (file: TFile) => {
						this.plugin.settings.indexFile = file.path;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show new value
					}).open();
				}));

		new Setting(containerEl)
			.setName('Output Directory')
			.setDesc('Values relative to the vault root.')
			.addText(text => text
				.setPlaceholder('dist')
				.setValue(this.plugin.settings.outputDir)
				.onChange(async (value) => {
					this.plugin.settings.outputDir = value;
					await this.plugin.saveSettings();
					this.plugin.refreshFileExplorerIcons();
				}));


		new Setting(containerEl)
			.setName('Allow Private Folders')
			.setDesc('Enable the ability to lock specific root folders from the file explorer.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.allowPrivateFolders)
				.onChange(async (value) => {
					this.plugin.settings.allowPrivateFolders = value;
					await this.plugin.saveSettings();
					// Trigger UI update in main plugin
					this.plugin.refreshFileExplorerIcons();
				}));

		new Setting(containerEl)
			.setName('Generate Site')
			.setDesc('Generate the static site now.')
			.addButton(button => button
				.setButtonText('Generate Now')
				.setCta()
				.onClick(async () => {
					await this.plugin.generate();
				}));

	}
}

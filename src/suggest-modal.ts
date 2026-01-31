import { App, FuzzySuggestModal, TFile } from "obsidian";

export class FileSuggestModal extends FuzzySuggestModal<TFile> {
    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles().filter(file => {
            // Only allow files in the root directory
            return file.parent ? file.parent.path === '/' : false;
        });
    }

    getItemText(item: TFile): string {
        return item.name;
    }

    onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): void {
        this.callback(item);
    }

    callback: (file: TFile) => void;

    constructor(app: App, callback: (file: TFile) => void) {
        super(app);
        this.callback = callback;
        this.setPlaceholder("Select a note from the root folder...");
    }
}

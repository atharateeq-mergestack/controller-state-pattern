import { StorageController } from "./StorageController";

export interface AppStorage {
    theme: 'light' | 'dark';
    language: 'en' | 'fr';
    sidebarOpen: boolean;
}

export class AppStorageController extends StorageController<AppStorage> {
    constructor() {
        super({
            theme: 'light',
            language: 'en',
            sidebarOpen: false,
        });
    }

    // Custom method example
    toggleTheme() {
        const theme = this.getValue('theme');
        this.setState({ theme: theme === 'light' ? 'dark' : 'light' });
    }
}

export const appStorage = new AppStorageController();

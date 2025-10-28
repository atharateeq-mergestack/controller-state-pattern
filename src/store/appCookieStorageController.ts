import { StorageController } from "./StorageController";
import { StateObject } from '../types';

export interface AppCookieStorage extends StateObject {
    theme: 'light' | 'dark';
    language: 'en' | 'fr';
    sidebarOpen: boolean;
}

/**
 * Example StorageController using cookies instead of localStorage
 * Cookies are useful for SSR scenarios (like Next.js) where server needs access to values
 */
export class AppCookieStorageController extends StorageController<AppCookieStorage> {
    constructor() {
        super({
            theme: 'light',
            language: 'en',
            sidebarOpen: false,
        }, {
            storageType: 'cookie',
            // Optional: configure cookie attributes
            cookieOptions: {
                expires: 7, // 7 days
                secure: true, // Only send over HTTPS
                sameSite: 'strict',
                path: '/',
            }
        });
    }

    // Custom method example
    toggleTheme() {
        const theme = this.getValue('theme');
        this.setState({ theme: theme === 'light' ? 'dark' : 'light' });
    }
}

export const appCookieStorage = new AppCookieStorageController();

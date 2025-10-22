import { useAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, RESET, createJSONStorage } from 'jotai/utils';
import { store } from '../jotai-provider';

// SINGLE GLOBAL STORAGE CONTROLLER
export class StorageController {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private atoms: Record<string, WritableAtom<any, [any | typeof RESET], void>> = {};
    private storagePrefix = 'app_';

    // DEFINE YOUR KEYS + DEFAULTS HERE - ONLY ONCE!
    private readonly DEFAULT_STORAGE = {
        theme: 'light' as 'light' | 'dark',
        notifications: true,
        language: 'en' as const,
        sidebarOpen: false,
    } as const;

    private constructor() {
        this.autoCreateAtoms();
    }

    // SINGLETON INSTANCE
    private static instance: StorageController;
    public static getInstance(): StorageController {
        if (!StorageController.instance) {
            StorageController.instance = new StorageController();
        }
        return StorageController.instance;
    }

    // AUTO-CREATE ALL ATOMS FROM DEFAULT_STORAGE
    private autoCreateAtoms() {
        Object.entries(this.DEFAULT_STORAGE).forEach(([key, defaultValue]) => {
            this.atoms[key] = atomWithStorage(
                `${this.storagePrefix}${key}`,
                defaultValue,
                createJSONStorage(() => localStorage),
                { getOnInit: true }
            );
            this.atoms[key].debugLabel = key;
        });
    }

    // Get atom for a key
    private getAtom<K extends keyof typeof this.DEFAULT_STORAGE>(key: K): WritableAtom<typeof this.DEFAULT_STORAGE[K], [typeof this.DEFAULT_STORAGE[K] | typeof RESET], void> {
        return this.atoms[key];
    }

    // React hook: Get multiple keys
    useStorage<K extends keyof typeof this.DEFAULT_STORAGE>(keys: K[]): Pick<typeof this.DEFAULT_STORAGE, K> {
        const result: Partial<typeof this.DEFAULT_STORAGE> = {};
        keys.forEach(key => {
            const [value] = useAtom(this.getAtom(key));
            result[key] = value;
        });
        return result as Pick<typeof this.DEFAULT_STORAGE, K>;
    }

    // Set value
    setItem<K extends keyof typeof this.DEFAULT_STORAGE>(key: K, value: typeof this.DEFAULT_STORAGE[K]): void {
        store.set(this.getAtom(key), value);
    }

    // Reset to default
    resetItem<K extends keyof typeof this.DEFAULT_STORAGE>(key: K): void {
        store.set(this.getAtom(key), RESET);
    }

    // Get current value
    getItem<K extends keyof typeof this.DEFAULT_STORAGE>(key: K): typeof this.DEFAULT_STORAGE[K] {
        return store.get(this.getAtom(key));
    }

    // Set multiple
    setItems(newState: Partial<typeof this.DEFAULT_STORAGE>): void {
        Object.entries(newState).forEach(([key, value]) => {
            this.setItem(key as keyof typeof this.DEFAULT_STORAGE, value);
        });
    }

    // Reset multiple
    resetItems(keys: (keyof typeof this.DEFAULT_STORAGE)[]): void {
        keys.forEach(key => this.resetItem(key));
    }

    // Reset all
    resetAll(): void {
        Object.keys(this.DEFAULT_STORAGE).forEach(key => {
            this.resetItem(key as keyof typeof this.DEFAULT_STORAGE);
        });
    }

    // Get all current values
    getAll(): typeof this.DEFAULT_STORAGE {
        // Use an object spread to collect all values and return a new object (to avoid assigning to readonly properties)
        const result = Object.fromEntries(
            Object.keys(this.DEFAULT_STORAGE).map(key => [
                key,
                this.getItem(key as keyof typeof this.DEFAULT_STORAGE)
            ])
        );
        return result as typeof this.DEFAULT_STORAGE;
    }

    // Theme-specific methods
    toggleTheme(): void {
        const currentTheme = this.getItem('theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setItem('theme', newTheme);
    }
}
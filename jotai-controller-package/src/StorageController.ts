import { useAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, createJSONStorage, RESET } from 'jotai/utils';
import { createStore } from 'jotai';
import Cookies from 'js-cookie';
import { StateObject } from './types';
import { BaseController } from './BaseController';

/**
 * Storage type options
 */
export type StorageType = 'localStorage' | 'sessionStorage' | 'cookie';

/**
 * Persistent Storage Controller (Same API as StateController, but with localStorage/sessionStorage/cookies)
 */
export class StorageController<T extends StateObject> extends BaseController<T> {
    /** Prefix for storage keys to avoid conflicts */
    storagePrefix = '';
    /** Internal atoms map for each state key */
    protected atoms: Record<string, WritableAtom<unknown, [unknown | typeof RESET], void>> = {};
    /** JSON storage instance for persistence */
    protected storage;
    /** Storage type being used */
    protected storageType: StorageType;
    private isClient: boolean = false;  // Track if we're on the client

    /**
     * Creates a new StorageController instance
     * @param initialState - Initial state values for all keys
     * @param options - Optional configuration: prefix, storageType, customStore, cookieOptions
     */
    constructor(
        initialState: T,
        options?: {
            prefix?: string;
            storageType?: StorageType;
            customStore?: ReturnType<typeof createStore>;
            cookieOptions?: Cookies.CookieAttributes;
        }
    ) {
        super(initialState, options?.customStore);
        this.storagePrefix = options?.prefix ?? this.storagePrefix;
        this.storageType = options?.storageType ?? 'localStorage';

        // Check if we're on the client-side
        if (typeof window !== 'undefined') {
            this.isClient = true;
            // Create the appropriate storage adapter only if on the client
            if (this.storageType === 'cookie') {
                this.storage = this.createCookieStorage(options?.cookieOptions);
            } else {
                const storage = this.storageType === 'sessionStorage' ? sessionStorage : localStorage;
                this.storage = createJSONStorage(() => storage);
            }
        }
    }

    /**
     * Creates a cookie storage adapter compatible with jotai's createJSONStorage
     */
    private createCookieStorage(cookieOptions?: Cookies.CookieAttributes) {
        return createJSONStorage(() => ({
            getItem: (key: string) => {
                const value = Cookies.get(key);
                return value ?? null;
            },
            setItem: (key: string, value: unknown) => {
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                Cookies.set(key, stringValue, cookieOptions);
            },
            removeItem: (key: string) => {
                Cookies.remove(key);
            },
        }));
    }

    /**
     * Get or create atom with persistent storage
     */
    private getAtom<K extends keyof T>(key: K): WritableAtom<T[K], [T[K] | typeof RESET], void> {
        if (!this.atoms[key as string]) {
            const storageKey = `${this.storagePrefix}${String(key)}`;
            this.atoms[key as string] = atomWithStorage(
                storageKey,
                this.initialState[key],
                this.storage,
                { getOnInit: this.isClient }  // Initialize only if on the client
            );
            this.atoms[key as string].debugLabel = `${String(key)}`;
        }
        return this.atoms[key as string] as WritableAtom<T[K], [T[K] | typeof RESET], void>;
    }


    /**
     * Return a hook function instead of calling it directly
     */
    useScopeState<K extends keyof T>(key: K) {
        return () => useAtom(this.getAtom(key));
    }

    /**
     * Hook - same as useGenericHooks / useState
     */
    useState(keys: (keyof T)[]): Partial<T> {
        const values: Partial<T> = {};
        keys.forEach(key => {
            const [val] = useAtom(this.getAtom(key));
            values[key] = val;
        });
        return values;
    }



    /**
     * Reset a single state (override to use RESET)
     */
    resetState<K extends keyof T>(key: K) {
        const prevValue = this.getValue(key);
        this.store.set(this.getAtom(key), RESET);
        this.notifyKeyListeners(key, this.initialState[key], prevValue);
    }

    // Implement abstract methods from BaseController
    protected getKeyValue<K extends keyof T>(key: K): T[K] {
        return this.store.get(this.getAtom(key));
    }

    protected setKeyValue<K extends keyof T>(key: K, value: T[K]): void {
        this.store.set(this.getAtom(key), value);
    }

    protected getAllCurrentValues(): T {
        const result = {} as T;
        Object.keys(this.initialState).forEach(key => {
            result[key as keyof T] = this.getValue(key as keyof T);
        });
        return result;
    }

    /**
     * Get all current values (same as getValues but all)
     */
    getAllValues(): T {
        return this.getAllCurrentValues();
    }


    /**
     * Utility: Toggle boolean key (optional)
     */
    toggle<K extends keyof T>(key: K) {
        const current = this.getValue(key);
        if (typeof current === 'boolean') {
            this.setState({ [key]: !current } as Partial<T>);
        } else {
            console.warn(`Cannot toggle non-boolean key: ${String(key)}`);
        }
    }
}


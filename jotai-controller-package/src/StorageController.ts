import { useAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, createJSONStorage, RESET } from 'jotai/utils';
import { createStore } from 'jotai';
import Cookies from 'js-cookie';
import { StateObject, StateChangeListener } from './types';
import { store } from './Provider';

/**
 * Storage type options
 */
export type StorageType = 'localStorage' | 'sessionStorage' | 'cookie';

/**
 * Persistent Storage Controller (Same API as StateController, but with localStorage/sessionStorage/cookies)
 */
export class StorageController<T extends StateObject> {
    /** Jotai store instance for state management */
    store: ReturnType<typeof createStore>;
    /** Prefix for storage keys to avoid conflicts */
    storagePrefix = '';
    /** Internal atoms map for each state key */
    protected atoms: Record<string, WritableAtom<unknown, [unknown | typeof RESET], void>> = {};
    /** Initial state values for reset functionality */
    protected initialState: T;
    /** JSON storage instance for persistence */
    protected storage;
    /** Storage type being used */
    protected storageType: StorageType;
    /** Map of listeners for state change notifications */
    private listeners: Map<keyof T, Set<StateChangeListener<T, keyof T>>> = new Map();

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
        this.store = options?.customStore || store;
        this.initialState = initialState;
        this.storagePrefix = options?.prefix ?? this.storagePrefix;
        this.storageType = options?.storageType ?? 'localStorage';

        // Create the appropriate storage adapter
        if (this.storageType === 'cookie') {
            this.storage = this.createCookieStorage(options?.cookieOptions);
        } else {
            const storage = this.storageType === 'sessionStorage' ? sessionStorage : localStorage;
            this.storage = createJSONStorage(() => storage);
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
                { getOnInit: true }
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
     * Get current values for multiple keys (same as getValues)
     */
    getValues(keys: (keyof T)[]): Partial<T> {
        const values: Partial<T> = {};
        keys.forEach(key => {
            values[key] = this.store.get(this.getAtom(key));
        });
        return values;
    }

    /**
     * Get a single key (same as getValue)
     */
    getValue<K extends keyof T>(key: K): T[K] {
        return this.store.get(this.getAtom(key));
    }

    /**
     * Set multiple values (same as setState)
     */
    setState(newState: Partial<T>) {
        const prevState = this.getAllValues();
        Object.entries(newState).forEach(([key, val]) => {
            this.store.set(this.getAtom(key as keyof T), val as T[keyof T]);
        });
        this.notifyListeners(newState, prevState);
    }

    /**
     * Update state (merge) - same as updateState
     */
    updateState(newState: Partial<T>) {
        const prevState = this.getAllValues();
        const updatedState = { ...prevState, ...newState };
        Object.entries(updatedState).forEach(([key, val]) => {
            this.store.set(this.getAtom(key as keyof T), val as T[keyof T]);
        });
        this.notifyListeners(newState, prevState);
    }

    /**
     * Reset a single state (same as resetState)
     */
    resetState<K extends keyof T>(key: K) {
        const prevValue = this.getValue(key);
        this.store.set(this.getAtom(key), RESET);
        this.notifyKeyListeners(key, this.initialState[key], prevValue);
    }

    /**
     * Reset multiple states (same as resetStates)
     */
    resetStates(keys: (keyof T)[]) {
        keys.forEach(key => this.resetState(key));
    }

    /**
     * Reset all (same as resetAll)
     */
    resetAll() {
        Object.keys(this.initialState).forEach(key => this.resetState(key as keyof T));
    }

    /**
     * Get all current values (same as getValues but all)
     */
    getAllValues(): T {
        const result = {} as T;
        Object.keys(this.initialState).forEach(key => {
            result[key as keyof T] = this.getValue(key as keyof T);
        });
        return result;
    }

    /**
     * Subscribe to a key change (same signature)
     */
    subscribe<K extends keyof T>(key: K, listener: StateChangeListener<T, K>): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        const keyListeners = this.listeners.get(key)!;
        keyListeners.add(listener as StateChangeListener<T, keyof T>);

        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(listener as StateChangeListener<T, keyof T>);
                if (listeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * Notify listeners for all updated keys (same logic)
     */
    private notifyListeners(newState: Partial<T>, prevState: T): void {
        Object.keys(newState).forEach(key => {
            const typedKey = key as keyof T;
            this.notifyKeyListeners(typedKey, newState[typedKey] as T[typeof typedKey], prevState[typedKey]);
        });
    }

    /**
     * Notify listeners for one key (same logic)
     */
    private notifyKeyListeners<K extends keyof T>(key: K, newValue: T[K], oldValue: T[K]): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners && keyListeners.size > 0) {
            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                keyListeners.forEach(listener => {
                    try {
                        listener(newValue, oldValue);
                    } catch (err) {
                        console.error(`Error in storage listener for ${String(key)}:`, err);
                    }
                });
            }
        }
    }

    /**
     * Clear all listeners (same as clearAllListeners)
     */
    clearAllListeners() {
        this.listeners.clear();
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


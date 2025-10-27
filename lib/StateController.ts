import { focusAtom } from 'jotai-optics';
import { useAtom, atom, type WritableAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { createStore } from 'jotai';
import { StateObject, StateChangeListener } from './types';

// Base Class for Jotai State Controller
export class StateController<T extends StateObject> {
    store;
    state: WritableAtom<T, [T], void>;
    focusState: { [K in keyof T]: WritableAtom<T[K], [T[K]], void> };
    initialState: T;
    private listeners: Map<keyof T, Set<StateChangeListener<T, keyof T>>>;

    constructor(name: string, initialState: T, customStore?: ReturnType<typeof createStore>) {
        this.store = customStore || createStore();
        this.initialState = initialState;
        this.state = atom(this.initialState);
        this.state.debugLabel = name;
        this.focusState = {} as { [K in keyof T]: WritableAtom<T[K], [T[K]], void> };
        this.listeners = new Map();
        Object.keys(initialState).forEach(key => {
            this.getFocusItem(key);
        });
    }

    getFocusItem(key: keyof T) {
        if (!this.focusState[key]) {
            this.focusState[key] = focusAtom(this.state, optic =>
                // @ts-expect-error - Complex optics types from jotai-optics
                (key as string).split('.').reduce((acc: unknown, part: string) => (acc as Record<string, unknown>).prop(part), optic)
            ) as WritableAtom<T[typeof key], [T[typeof key]], void>;
        }
        this.focusState[key].debugPrivate = true
        return this.focusState[key];
    }

    useGenericHooks(keys: (keyof T)[]): Partial<T> {
        const atoms = keys.map(key => this.getFocusItem(key));
        const values = atoms.map(atom => useAtom(atom)[0]);

        const keysVal: Partial<T> = {};
        keys.forEach((key, index) => {
            keysVal[key] = values[index];
        });

        return keysVal;
    }

    useState(keys: (keyof T)[]) {
        return this.useGenericHooks(keys);
    }

    useScopeState(key: keyof T) {
        if (!this.focusState[key])
            this.focusState[key] = focusAtom(this.state, optic =>
                // @ts-expect-error - Complex optics types from jotai-optics
                (key as string).split('.').reduce((acc: unknown, part: string) => (acc as Record<string, unknown>).prop(part), optic)
            ) as WritableAtom<T[typeof key], [T[typeof key]], void>;
        return () => useAtom(this.focusState[key]);
    }

    useHydration(state: T) {
        const hydratedStates: [WritableAtom<T[string], [T[string]], void>, T[string]][] = [];
        Object.keys(state).forEach(key => {
            this.getFocusItem(key);
            hydratedStates.push([this.focusState[key], state[key] as T[string]]);
        });
        return () => useHydrateAtoms(hydratedStates);
    }

    setState(newState: Partial<T>) {
        // Get current state for comparison with new state (for listeners)
        const prevState = this.store.get(this.state);

        Object.keys(newState).forEach(key => {
            this.getFocusItem(key);
        });
        // Merge the inital state with the previous state
        const updatedState = { ...this.initialState, ...newState };

        // Set the updated state directly
        this.store.set(this.state, updatedState as T);

        // Trigger listeners for changed keys
        this.notifyListeners(newState, prevState);
    }

    updateState(newState: Partial<T>) {
        Object.keys(newState).forEach(key => {
            this.getFocusItem(key);
        });
        // Get the current state value
        const prevState = this.store.get(this.state);

        // Merge the new state with the previous state
        const updatedState = { ...prevState, ...newState };
        // Set the updated state directly
        this.store.set(this.state, updatedState as T);

        // Trigger listeners for changed keys
        this.notifyListeners(newState, prevState);
    }

    getValues(keys: (keyof T)[]) {
        const returnValues = {} as Partial<T>;
        keys.forEach(key => {
            returnValues[key] = this.store.get(this.focusState[key]);
        });
        return returnValues;
    }

    getValue = <K extends keyof T>(key: K): T[K] => {
        try {
            return this.focusState[key] ? this.store.get(this.focusState[key]) : (null as T[K]);
        } catch {
            throw Error(`Key: ${key as string} does not exist in initial State of`);
        }
    };

    resetAll() {
        this.store.set(this.state, this.initialState);
    }

    resetStates(keys: (keyof T)[]) {
        keys.forEach(key => {
            this.store.set(this.focusState[key], this.initialState[key]);
        });
    }

    resetState(key: keyof T) {
        const prevValue = this.store.get(this.focusState[key]);
        this.store.set(this.focusState[key], this.initialState[key]);

        // Notify listeners for this specific key
        this.notifyKeyListeners(key, this.initialState[key], prevValue);
    }

    /**
     * Subscribe to changes on a specific state key
     * @param key The state key to listen for changes
     * @param listener Callback function that receives the new and old values
     * @returns Unsubscribe function to remove the listener
     */
    subscribe<K extends keyof T>(key: K, listener: StateChangeListener<T, K>): () => void {
        // Validate that this method is being called from a method that starts with 'on'
        const stack = new Error().stack;
        if (stack) {
            const callerMethod = stack.split('\n')[2]?.trim();
            if (callerMethod && !callerMethod.includes('at on')) {
                console.warn('Warning: subscribe method should only be called from methods starting with "on"');
            }
        }
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        const keyListeners = this.listeners.get(key)!;
        keyListeners.add(listener as StateChangeListener<T, keyof T>);

        // Return unsubscribe function
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
     * Subscribe to changes on multiple state keys at once
     * @param keys Array of state keys to listen for changes
     * @param listener Callback function that receives the changed keys
     * @returns Unsubscribe function to remove all listeners
     */
    subscribeToKeys(keys: (keyof T)[], listener: (changedKeys: Partial<T>, allKeys: Partial<T>) => void): () => void {
        // Validate that this method is being called from a method that starts with 'on'
        const stack = new Error().stack;
        if (stack) {
            const callerMethod = stack.split('\n')[2]?.trim();
            if (callerMethod && !callerMethod.includes('at on')) {
                console.warn('Warning: subscribeToKeys method should only be called from methods starting with "on"');
            }
        }
        const unsubscribers: (() => void)[] = [];

        // Create a set to track which keys have changed
        const changedKeysSet = new Set<keyof T>();

        // Helper function to debounce the listener call
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const notifyChanges = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (changedKeysSet.size > 0) {
                    listener(this.getValues(Array.from(changedKeysSet)), this.getValues(keys));
                    changedKeysSet.clear();
                }
            }, 0);
        };

        // Subscribe to each key
        keys.forEach(key => {
            const unsub = this.subscribe(key, () => {
                changedKeysSet.add(key);
                notifyChanges();
            });
            unsubscribers.push(unsub);
        });

        // Return a function that unsubscribes all listeners
        return () => {
            unsubscribers.forEach(unsub => unsub());
            if (timeout) clearTimeout(timeout);
        };
    }

    /**
     * Internal method to notify listeners of state changes
     */
    private notifyListeners(newState: Partial<T>, prevState: T): void {
        Object.keys(newState).forEach(key => {
            const typedKey = key as keyof T;
            this.notifyKeyListeners(typedKey, newState[typedKey] as T[typeof typedKey], prevState[typedKey]);
        });
    }

    /**
     * Internal method to notify listeners for a specific key
     */
    private notifyKeyListeners<K extends keyof T>(key: K, newValue: T[K], oldValue: T[K]): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners && keyListeners.size > 0) {
            // Only notify if the value has actually changed
            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                keyListeners.forEach(listener => {
                    try {
                        listener(newValue, oldValue);
                    } catch (error) {
                        console.error(`Error in state change listener for key ${String(key)}:`, error);
                    }
                });
            }
        }
    }

    /**
     * Clear all active listeners
     */
    clearAllListeners() {
        this.listeners.clear();
    }

    /**
     * Automatically binds all methods of the class to the current instance
     * This ensures that 'this' always refers to the controller instance
     * when methods are passed as callbacks or used in React components
     */
    bindMethods(instance: StateObject | object) {
        const proto = Object.getPrototypeOf(instance);
        // Get all properties including inherited ones
        const propertyNames = Object.getOwnPropertyNames(proto).filter(
            prop => typeof (instance as StateObject)[prop] === 'function' && prop !== 'constructor'
        );
        // Iterate through all properties
        propertyNames.forEach(name => {
            const property = this[name as keyof this];

            // Only bind if it's a method (function) and not the constructor
            if (typeof property === 'function' && name !== 'constructor') {
                // Bind the method to this instance
                (this as StateObject)[name] = property.bind(this);
            }
        });
    }

    /**
     * Stores all active subscriptions created by 'on' methods
     * Used for cleanup when needed
     */
    private activeSubscriptions: Map<string, () => void> = new Map();

    /**
     * Automatically subscribes all methods that start with 'on'
     * This eliminates the need to manually call subscription methods in the constructor
     */
    autoSubscribeOnMethods(instance: StateObject | object) {
        // Get all properties including inherited ones
        const propertyNames = Object.getOwnPropertyNames(instance).filter(
            prop => typeof (instance as StateObject)[prop] === 'function' && prop !== 'constructor'
        );
        // Find all methods that start with 'on'
        propertyNames.forEach(name => {
            if (name.startsWith('on') && typeof this[name as keyof this] === 'function') {
                try {
                    // Call the method and store the unsubscribe function if returned
                    const unsubscribe = (this[name as keyof this] as () => (() => void) | void)();
                    if (typeof unsubscribe === 'function') {
                        this.activeSubscriptions.set(name, unsubscribe);
                    }
                } catch (error) {
                    console.error(`Error auto-subscribing method ${name}:`, error);
                }
            }
        });
    }

    /**
     * Unsubscribes all automatically subscribed 'on' methods
     * Useful for cleanup during component unmounting or hot reloading
     */
    unsubscribeAll() {
        // Call all stored unsubscribe functions
        this.activeSubscriptions.forEach((unsubscribe, methodName) => {
            try {
                unsubscribe();
            } catch (error) {
                console.error(`Error unsubscribing method ${methodName}:`, error);
            }
        });

        // Clear the map
        this.activeSubscriptions.clear();

        // Also clear all listeners
        this.clearAllListeners();
    }
}


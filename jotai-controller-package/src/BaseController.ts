import { createStore } from 'jotai';
import { StateObject, StateChangeListener } from './types';
import { store } from './Provider';

/**
 * Abstract base class for state and storage controllers
 * Extracts common functionality for DRY principle
 */
export abstract class BaseController<T extends StateObject> {
    protected store: ReturnType<typeof createStore>;
    protected initialState: T;
    protected listeners: Map<keyof T, Set<StateChangeListener<T, keyof T>>> = new Map();

    constructor(initialState: T, customStore?: ReturnType<typeof createStore>) {
        this.store = customStore || store;
        this.initialState = initialState;
    }

    /**
     * Abstract method to get the current value of a key
     * Must be implemented by subclasses
     */
    protected abstract getKeyValue<K extends keyof T>(key: K): T[K];

    /**
     * Abstract method to set the value of a key
     * Must be implemented by subclasses
     */
    protected abstract setKeyValue<K extends keyof T>(key: K, value: T[K]): void;

    /**
     * Abstract method to get all current values
     * Must be implemented by subclasses
     */
    protected abstract getAllCurrentValues(): T;

    /**
     * Subscribe to changes on a specific state key
     * @param key The state key to listen for changes
     * @param listener Callback function that receives the new and old values
     * @returns Unsubscribe function to remove the listener
     */
    subscribe<K extends keyof T>(key: K, listener: StateChangeListener<T, K>): () => void {
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
     * Clear all active listeners
     */
    clearAllListeners() {
        this.listeners.clear();
    }

    /**
     * Internal method to notify listeners of state changes
     */
    protected notifyListeners(newState: Partial<T>, prevState: T): void {
        Object.keys(newState).forEach(key => {
            const typedKey = key as keyof T;
            this.notifyKeyListeners(typedKey, newState[typedKey] as T[typeof typedKey], prevState[typedKey]);
        });
    }

    /**
     * Internal method to notify listeners for a specific key
     */
    protected notifyKeyListeners<K extends keyof T>(key: K, newValue: T[K], oldValue: T[K]): void {
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
     * Reset multiple states by calling resetState for each key
     */
    resetStates(keys: (keyof T)[]) {
        keys.forEach(key => this.resetState(key));
    }

    /**
     * Reset all states
     */
    resetAll() {
        Object.keys(this.initialState).forEach(key => {
            this.resetState(key as keyof T);
        });
    }

    /**
     * Reset a single state key to its initial value
     */
    resetState(key: keyof T) {
        const prevValue = this.getValue(key);
        this.setKeyValue(key, this.initialState[key]);
        this.notifyKeyListeners(key, this.initialState[key], prevValue);
    }

    /**
     * Get a single value by key
     */
    getValue<K extends keyof T>(key: K): T[K] {
        return this.getKeyValue(key);
    }

    /**
     * Get multiple values by keys
     */
    getValues(keys: (keyof T)[]): Partial<T> {
        const returnValues = {} as Partial<T>;
        keys.forEach(key => {
            returnValues[key] = this.getKeyValue(key);
        });
        return returnValues;
    }

    /**
     * Set state (replace with new values, merging with initial state)
     */
    setState(newState: Partial<T>) {
        const prevState = this.getAllCurrentValues();
        Object.keys(newState).forEach(key => {
            this.setKeyValue(key as keyof T, newState[key as keyof T] as T[keyof T]);
        });
        this.notifyListeners(newState, prevState);
    }

    /**
     * Update state (merge with current state)
     */
    updateState(newState: Partial<T>) {
        const prevState = this.getAllCurrentValues();
        const updatedState = { ...prevState, ...newState };
        Object.keys(updatedState).forEach(key => {
            this.setKeyValue(key as keyof T, updatedState[key as keyof T] as T[keyof T]);
        });
        this.notifyListeners(newState, prevState);
    }
}


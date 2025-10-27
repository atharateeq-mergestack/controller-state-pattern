/**
 * Base type for all state objects that can be managed by controllers
 * Provides an index signature for dynamic property access
 */
export type StateObject = Record<string, unknown>;

/**
 * Type for state change listeners
 * @template T - The state type
 * @template K - The specific key being listened to
 */
export type StateChangeListener<T, K extends keyof T> = (newValue: T[K], oldValue: T[K] | undefined) => void;


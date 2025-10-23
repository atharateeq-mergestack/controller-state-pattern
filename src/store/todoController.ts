import React from 'react';
import { StateController } from './stateController';
import { StateObject } from '../types';

export type Todo = {
    id: string;
    text: string;
    completed: boolean;
};

type TodoState = {
    todos: Todo[];
    filter: 'all' | 'active' | 'completed';
    searchQuery: string;
} & StateObject;

export class TodoController extends StateController<TodoState> {
    constructor() {
        super('TodoController', {
            todos: [],
            filter: 'all',
            searchQuery: ''
        });
        // Automatically bind all methods to this instance
        this.bindMethods(this);

        // Automatically subscribe methods that start with 'on'
        this.autoSubscribeOnMethods(this);
    }


    useTodoStats = () => {
        const { todos } = this.useState(['todos']);

        return React.useMemo(() => {
            const stats = {
                total: todos?.length,
                active: todos?.filter(todo => !todo.completed).length,
                completed: todos?.filter(todo => todo.completed).length
            };
            return stats;
        }, [todos]);
    };

    addTodo = (text: string) => {
        const newTodo: Todo = {
            id: Date.now().toString(),
            text,
            completed: false
        };
        const currentTodos = this.getValue('todos');
        this.updateState({ todos: [...currentTodos, newTodo] });
    };

    toggleTodo = (id: string) => {
        const todos = this.getValue('todos');
        const updatedTodos = todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        this.updateState({ todos: updatedTodos });
    };

    deleteTodo = (id: string) => {
        const todos = this.getValue('todos');
        const updatedTodos = todos.filter(todo => todo.id !== id);
        this.updateState({ todos: updatedTodos });
    };

    setFilter = (filter: TodoState['filter']) => {
        this.updateState({ filter });
    };

    setSearchQuery = (query: string) => {
        this.updateState({ searchQuery: query });
    };

    useFilteredTodos = () => {
        const { todos, filter, searchQuery } = this.useState(['todos', 'filter', 'searchQuery']);

        return React.useMemo(() => {
            let filtered = todos;

            // Apply status filter
            switch (filter) {
                case 'active':
                    filtered = filtered?.filter(todo => !todo.completed);
                    break;
                case 'completed':
                    filtered = filtered?.filter(todo => todo.completed);
                    break;
            }

            // Apply search filter
            if (searchQuery) {
                filtered = filtered?.filter(todo =>
                    todo.text.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            return { todos: filtered, filter };
        }, [todos, filter, searchQuery])
    };

    // Subscribe to changes in the todo list
    onTodosChange = () => {
        return this.subscribeToKeys(['todos', 'filter'], (changedKeys, allKeys) => {
            console.log('These keys changed:', changedKeys);
            console.log('These all keys :', allKeys);
        });
    };

}

export const todoController = new TodoController();
import { StateController } from './stateController';
import { StateObject } from '../types';

type UserState = {
    name: string;
    role: 'admin' | 'user';
    lastAction: string;
} & StateObject;

export class UserController extends StateController<UserState> {
    constructor() {
        super('UserController', {
            name: '',
            role: 'user',
            lastAction: ''
        });
        console.log('here')
        this.bindMethods(this);
        this.autoSubscribeOnMethods(this);
    }

    setName = (name: string) => {
        this.updateState({ name });
    };

    setRole = (role: UserState['role']) => {
        this.updateState({ role });
    };

}

export const userController = new UserController();
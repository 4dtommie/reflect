import { writable } from 'svelte/store';
import type { TransactionData } from './transactionModalStore';

interface CreateSubscriptionModalState {
    isOpen: boolean;
    transaction: TransactionData | null;
}

const initialState: CreateSubscriptionModalState = {
    isOpen: false,
    transaction: null
};

function createStore() {
    const { subscribe, set } = writable<CreateSubscriptionModalState>(initialState);

    return {
        subscribe,
        open(transaction: TransactionData) {
            set({
                isOpen: true,
                transaction
            });
        },
        close() {
            set(initialState);
        }
    };
}

export const createSubscriptionModalStore = createStore();

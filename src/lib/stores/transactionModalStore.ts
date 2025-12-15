import { writable } from 'svelte/store';

export interface TransactionData {
    id: number;
    date: string | Date;
    merchantName: string;
    amount: number | string;
    description: string;
    cleaned_merchant_name?: string | null;
    is_debit?: boolean;
    category?: {
        id: number;
        name: string;
        icon?: string | null;
        color?: string | null;
    } | null;
    merchant?: {
        id?: number;
        name: string;
    } | null;
    type?: string;
    is_recurring?: boolean;
    recurring_transaction_id?: number | null;
    recurring_transaction?: {
        id: number;
        name: string;
        interval: string;
    } | null;
}

interface TransactionModalState {
    isOpen: boolean;
    transaction: TransactionData | null;
}

const initialState: TransactionModalState = {
    isOpen: false,
    transaction: null
};

function createTransactionModalStore() {
    const { subscribe, set } = writable<TransactionModalState>(initialState);

    return {
        subscribe,

        /**
         * Open the modal with the given transaction
         */
        open(transaction: TransactionData) {
            set({
                isOpen: true,
                transaction
            });
        },

        /**
         * Close the modal
         */
        close() {
            set(initialState);
        }
    };
}

export const transactionModalStore = createTransactionModalStore();

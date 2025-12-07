import { writable } from 'svelte/store';

export interface RecurringTransaction {
    id: number;
    date: string | Date;
    amount: number;
    merchantName?: string | null;
}

export interface RecurringData {
    id: number;
    name: string;
    amount: number;
    interval: string | null;
    status: string;
    type?: string | null;
    next_expected_date: string | Date | null;
    created_at?: string | Date;
    transactions: RecurringTransaction[];
    merchants?: { name: string } | null;
    categories?: { id: number; name: string; icon?: string | null; color?: string | null } | null;
    isIncome?: boolean;
}

interface RecurringModalState {
    isOpen: boolean;
    recurring: RecurringData | null;
}

const initialState: RecurringModalState = {
    isOpen: false,
    recurring: null
};

function createRecurringModalStore() {
    const { subscribe, set } = writable<RecurringModalState>(initialState);

    return {
        subscribe,

        /**
         * Open the modal with the given recurring pattern
         */
        open(recurring: RecurringData) {
            set({
                isOpen: true,
                recurring
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

export const recurringModalStore = createRecurringModalStore();

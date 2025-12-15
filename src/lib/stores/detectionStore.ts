import { writable } from 'svelte/store';
import { invalidateAll, goto } from '$app/navigation';

interface DetectionState {
    showModal: boolean;
    isDetecting: boolean;
    progress: number;
    status: string;
    error: string | null;
}

const initialState: DetectionState = {
    showModal: false,
    isDetecting: false,
    progress: 0,
    status: '',
    error: null
};

function createDetectionStore() {
    const { subscribe, set, update } = writable<DetectionState>(initialState);

    return {
        subscribe,

        /**
         * Start the detection process - can be called from anywhere
         */
        async runDetection() {
            update(s => ({
                ...s,
                showModal: true,
                isDetecting: true,
                error: null,
                progress: 10,
                status: 'Starting pattern detection...'
            }));

            try {
                // Step 1: Detect recurring
                update(s => ({ ...s, progress: 30, status: 'Scanning for subscriptions and recurring payments...' }));
                const recurringRes = await fetch('/api/recurring/detect', { method: 'POST' });

                if (!recurringRes.ok) {
                    throw new Error('Failed to detect recurring patterns');
                }

                // Step 2: Detect variable spending
                update(s => ({ ...s, progress: 60, status: 'Analyzing variable spending patterns...' }));
                const variableRes = await fetch('/api/variable-spending/detect', { method: 'POST' });

                if (!variableRes.ok) {
                    throw new Error('Failed to detect variable spending');
                }

                // Step 3: Auto-save variable spending if found
                const variableData = await variableRes.json();
                if (variableData.patterns?.length > 0) {
                    update(s => ({ ...s, progress: 80, status: 'Saving variable spending patterns...' }));
                    await fetch('/api/variable-spending', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ patterns: variableData.patterns })
                    });
                }

                // Done!
                update(s => ({ ...s, progress: 100, status: 'Detection complete!' }));

                // Brief pause to show completion, then close and refresh
                await new Promise(resolve => setTimeout(resolve, 800));
                set(initialState);
                await invalidateAll();
                await goto('/recurring');

            } catch (e) {
                console.error('Detection error:', e);
                update(s => ({
                    ...s,
                    isDetecting: false,
                    error: e instanceof Error ? e.message : 'Detection failed'
                }));
            }
        },

        close() {
            set(initialState);
        }
    };
}

export const detectionStore = createDetectionStore();

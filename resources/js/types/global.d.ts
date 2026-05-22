import type { Config, RouteName } from 'ziggy-js';
import type { Auth } from '@/types/auth';

declare global {
    var route: (
        name?: RouteName,
        params?: any,
        absolute?: boolean,
        config?: Config,
    ) => any;
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            flash?: {
                success?: string;
                error?: string;
            };
            [key: string]: unknown;
        };
    }
}

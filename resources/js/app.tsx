import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

let appName = import.meta.env.VITE_APP_NAME || 'Bank Mini';
try {
    const el = document.getElementById('app');
    if (el?.dataset?.page) {
        const page = JSON.parse(el.dataset.page);
        if (page?.props?.name) {
            appName = page.props.name;
        }
    }
} catch (e) {
    // fallback
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

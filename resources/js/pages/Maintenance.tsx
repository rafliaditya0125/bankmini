import { Head, router } from '@inertiajs/react';

interface MaintenanceProps {
    message: string;
}

export default function Maintenance({ message }: MaintenanceProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
            <Head title="Maintenance" />
            
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="h-24 w-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </div>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Maintenance Mode</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                    {message}
                </p>
                
                <div className="pt-6 border-t border-gray-100">
                    <button
                        onClick={() => router.post('/logout')}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 focus:ring-4 focus:ring-rose-500/20 shadow-lg shadow-rose-100 transition-all active:scale-[0.98] uppercase tracking-widest"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout dari Sistem
                    </button>
                </div>
            </div>
            
            <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Sistem Bank Mini SMK
            </p>
        </div>
    );
}

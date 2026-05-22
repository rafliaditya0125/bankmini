import React, { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the default browser prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
            // Show the custom prompt
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) return;

        // Show the native install prompt
        installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // We've used the prompt, and can't use it again, so throw it away
        setInstallPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[100] md:bottom-8 md:left-auto md:right-8 md:w-80 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
                    <img src="/images/bankmini-removebg-preview.png" alt="Logo" className="h-8 w-auto" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Install Aplikasi</p>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Pasang aplikasi Bank Mini di HP Anda untuk akses lebih cepat.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleInstallClick}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        Install
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Nanti
                    </button>
                </div>
            </div>
        </div>
    );
}

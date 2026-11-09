import { useState, useRef, useEffect, ReactNode, PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

interface DropdownProps extends PropsWithChildren {
    trigger: ReactNode;
    align?: 'left' | 'right';
    width?: string;
}

export default function Dropdown({ trigger, align = 'right', width = 'w-48', children }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });

    const updatePosition = () => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                right: document.documentElement.clientWidth - rect.right,
            });
        }
    };

    useEffect(() => {
        if (!open) return;

        updatePosition();

        let rAFId: number | null = null;
        const handleScrollOrResize = () => {
            if (rAFId) cancelAnimationFrame(rAFId);
            rAFId = requestAnimationFrame(updatePosition);
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (
                (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) &&
                (menuRef.current && !menuRef.current.contains(event.target as Node))
            ) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            if (rAFId) cancelAnimationFrame(rAFId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [open]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="cursor-pointer">
                {trigger}
            </div>

            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    className={`absolute z-[9999] mt-1 ${width} rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
                    style={{
                        top: coords.top,
                        left: align === 'left' ? coords.left : 'auto',
                        right: align === 'right' ? coords.right : 'auto'
                    }}
                    onClick={() => setOpen(false)}
                >
                    <div className="py-1">
                        {children}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

interface DropdownItemProps extends PropsWithChildren {
    onClick?: () => void;
    href?: string;
    className?: string;
    icon?: ReactNode;
}

export function DropdownItem({ onClick, href, className = '', icon, children }: DropdownItemProps) {
    const baseClasses = "flex items-center gap-2 px-4 py-2 text-sm transition-colors w-full text-left";
    const colorClasses = className || "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

    if (href) {
        return (
            <a href={href} className={`${baseClasses} ${colorClasses}`}>
                {icon && <span className="shrink-0">{icon}</span>}
                {children}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={`${baseClasses} ${colorClasses}`}>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </button>
    );
}

import { useState, useRef, useEffect, ReactNode, PropsWithChildren } from 'react';

interface DropdownProps extends PropsWithChildren {
    trigger: ReactNode;
    align?: 'left' | 'right';
    width?: string;
}

export default function Dropdown({ trigger, align = 'right', width = 'w-48', children }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={() => setOpen(!open)} className="cursor-pointer">
                {trigger}
            </div>

            {open && (
                <div className={`absolute z-50 mt-2 ${width} rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${align === 'right' ? 'right-0' : 'left-0'}`}>
                    <div className="py-1">
                        {children}
                    </div>
                </div>
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

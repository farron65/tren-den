import { useCallback, useRef, useState } from "react";

import { ToastContext, type ShowToast, type ToastType } from "./useToast";

import "./toast.css";

type Toast = {
    id: number,
    message: string,
    type: ToastType,
    leaving: boolean
}

const VISIBLE_MS = 3500;
const ERROR_VISIBLE_MS = 5000; // errors stay longer so there's time to read them
const EXIT_ANIMATION_MS = 200;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        // mark as leaving first so the fade-out can play, then remove it
        setToasts(current => current.map(t => t.id === id ? {...t, leaving: true} : t));
        setTimeout(() => {
            setToasts(current => current.filter(t => t.id !== id));
        }, EXIT_ANIMATION_MS);
    }, []);

    const showToast = useCallback<ShowToast>((message, type = "success") => {
        const id = nextId.current++;
        setToasts(current => [...current, { id, message, type, leaving: false }]);
        setTimeout(() => dismiss(id), type === "error" ? ERROR_VISIBLE_MS : VISIBLE_MS);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}${toast.leaving ? " toast-leaving" : ""}`}
                        role={toast.type === "error" ? "alert" : "status"}
                        onClick={() => dismiss(toast.id)}
                    >
                        <span className="toast-icon">{toast.type === "success" ? "✓" : "!"}</span>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

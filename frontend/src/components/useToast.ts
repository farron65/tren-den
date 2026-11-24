import { createContext, useContext } from "react";

export type ToastType = "success" | "error";
export type ShowToast = (message: string, type?: ToastType) => void;

export const ToastContext = createContext<ShowToast | null>(null);

// Call showToast("Saved") or showToast("Something broke", "error") from any page.
// Toasts live in ToastProvider (wrapped around the whole app), so they survive navigate().
export function useToast() {
    const showToast = useContext(ToastContext);
    if (!showToast) {
        throw new Error("useToast must be used inside <ToastProvider>");
    }
    return showToast;
}

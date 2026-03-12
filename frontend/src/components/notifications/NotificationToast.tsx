import { useEffect, type CSSProperties } from "react";

interface NotificationToastProps {
    message: {
        title?: string;
        body?: string;
    };
    onClose: () => void;
    duration?: number;
}

export default function NotificationToast({ message, onClose, duration = 3000 }: NotificationToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div style={styles.toast}>
            {message.title}
            <br></br>
            {message.body}
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    toast: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#2f2f2f",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "10px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
        zIndex: 9999,
    },
};

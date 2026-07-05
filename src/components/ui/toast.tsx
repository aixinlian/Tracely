import { useEffect, useState } from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const iconMap = {
  success: Check,
  error: X,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: "bg-green-500/10 text-green-600 border-green-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const Icon = iconMap[type];

  useEffect(() => {
    // 入场动画
    requestAnimationFrame(() => {
      setVisible(true);
    });

    // 自动关闭
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // 等待退场动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ease-out",
        visible ? "top-6 opacity-100" : "-top-20 opacity-0"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm",
          "min-w-[300px] max-w-[500px]",
          colorMap[type]
        )}
      >
        <Icon className="size-5 shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

// Toast 容器和管理器
let toastContainer: HTMLDivElement | null = null;
let toastId = 0;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

export const toast = {
  async show(message: string, options: ToastOptions = {}) {
    const container = getToastContainer();
    const id = `toast-${toastId++}`;
    const wrapper = document.createElement("div");
    wrapper.id = id;
    container.appendChild(wrapper);

    const { createRoot } = await import("react-dom/client");
    const root = createRoot(wrapper);

    const handleClose = () => {
      root.unmount();
      wrapper.remove();
    };

    root.render(
      <Toast
        message={message}
        type={options.type}
        duration={options.duration}
        onClose={handleClose}
      />
    );
  },

  success(message: string, duration = 3000) {
    this.show(message, { type: "success", duration });
  },

  error(message: string, duration = 3000) {
    this.show(message, { type: "error", duration });
  },

  warning(message: string, duration = 3000) {
    this.show(message, { type: "warning", duration });
  },

  info(message: string, duration = 3000) {
    this.show(message, { type: "info", duration });
  },
};

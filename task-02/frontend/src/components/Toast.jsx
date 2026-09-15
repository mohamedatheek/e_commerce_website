import { useToast } from '../context/ToastContext';

export default function ToastViewport() {
  const { toasts } = useToast();

  return (
    <div className="toast-wrap">
      {(Array.isArray(toasts) ? toasts : []).map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

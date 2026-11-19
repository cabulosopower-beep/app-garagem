import { X } from 'lucide-react';
import { useSignedUrl } from '@/lib/useSignedUrl';

interface ReceiptViewerProps {
  path: string | null;
  onClose: () => void;
}

export default function ReceiptViewer({ path, onClose }: ReceiptViewerProps) {
  const { url, loading } = useSignedUrl(path);
  if (!path) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X size={22} />
      </button>
      {loading ? (
        <div className="text-white/60 text-sm">Carregando recibo…</div>
      ) : url ? (
        <img
          src={url}
          alt="Recibo"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-white/60 text-sm">Não foi possível carregar o recibo.</div>
      )}
    </div>
  );
}

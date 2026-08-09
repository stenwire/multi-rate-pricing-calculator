import { useEffect, useRef } from 'react';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
}

interface Props {
  request: ConfirmRequest | null;
  busy?: boolean;
  onDismiss: () => void;
}

// A native <dialog> rather than a div: the platform gives focus trapping, inert background
// and Escape-to-close for free, which a hand-rolled overlay would have to reimplement.
export default function ConfirmDialog({ request, busy, onDismiss }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (request && !element.open) {
      element.showModal();
    } else if (!request && element.open) {
      element.close();
    }
  }, [request]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        // Clicking the backdrop lands on the dialog element itself, never on its contents.
        if (event.target === ref.current) {
          onDismiss();
        }
      }}
      className="panel m-auto w-[min(28rem,calc(100vw-2rem))] p-0 text-ink shadow-xl"
    >
      {request && (
        <div className="p-5 sm:p-6">
          <h2 id="confirm-title" className="text-base font-semibold">
            {request.title}
          </h2>
          <p className="mt-2 text-sm text-muted">{request.body}</p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={onDismiss}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={request.onConfirm}
              className={`btn ${request.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            >
              {request.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

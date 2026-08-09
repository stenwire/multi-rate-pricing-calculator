import { useEffect, useRef } from 'react';
import { LineItem, LineItemInput } from '../api/client';
import LineItemForm, { draftFromLineItem } from './LineItemForm';

interface Props {
  open: boolean;
  /** The line being edited, or null when adding a new one. */
  line: LineItem | null;
  busy?: boolean;
  onSubmit: (input: LineItemInput) => void;
  onClose: () => void;
}

// Editing happens where the user clicked rather than in a form further down the page, which
// previously gave no sign that the Edit button had done anything.
export default function LineItemDialog({
  open,
  line,
  busy,
  onSubmit,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="line-item-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      className="panel m-auto w-[min(56rem,calc(100vw-2rem))] p-0 shadow-xl"
    >
      {open && (
        <div>
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <h2 id="line-item-dialog-title" className="text-base font-semibold">
              {line ? 'Edit line item' : 'Add line item'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-muted hover:bg-ledger hover:text-ink"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>

          <LineItemForm
            key={line?.id ?? 'new'}
            initial={line ? draftFromLineItem(line) : undefined}
            submitLabel={line ? 'Save changes' : 'Add line item'}
            busy={busy}
            onSubmit={onSubmit}
            onCancel={onClose}
            bare
          />
        </div>
      )}
    </dialog>
  );
}

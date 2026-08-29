import { Modal } from './ui';
import TransactionForm from './TransactionForm';

/** Modal global del botón "+ Agregar movimiento" del header. */
export default function QuickTransactionModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Agregar movimiento" wide>
      <TransactionForm
        onCancel={onClose}
        onSaved={() => {
          onSaved();
          onClose();
        }}
      />
    </Modal>
  );
}

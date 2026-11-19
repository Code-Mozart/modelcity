import type { ToastKind } from '../ui/toasts.svelte';
import type { ModalTarget } from './modalHints';

/** Tell the user something (a toast, ^232). */
export type Notify = (kind: ToastKind, text: string) => void;

/** The state of the projects modal and what the user may do with it (^233): the part of the session that is about the modal. */
export abstract class ProjectModal {
  modalOpen = $state(false);
  /** The card being renamed or asked to be deleted (a second click confirms), if any. */
  row = $state<{ id: string; mode: 'rename' | 'delete' } | null>(null);
  /** What the pointer is over in the modal, for the hints (^181). */
  over = $state<ModalTarget | null>(null);
  /** The name being typed in a rename differs from the title: closing would throw it away (^233). */
  renameDirty = $state(false);
  /** The modal was opened to import: it opens the file window as soon as it is there (^223). */
  wantsImport = $state(false);
  protected abstract notify: Notify;

  /**
   * Whether the user may leave what they are doing in the modal: not while a rename has a name
   * that was changed (^233, avoid accidental actions that discard work); it says why.
   */
  mayLeave(): boolean {
    if (this.row?.mode !== 'rename' || !this.renameDirty) return true;
    this.notify('warning', 'Finish or cancel the rename first.');
    return false;
  }

  startRename(id: string) {
    if (this.mayLeave()) this.row = { id, mode: 'rename' };
  }

  startDelete(id: string) {
    if (this.mayLeave()) this.row = { id, mode: 'delete' };
  }

  cancelRow() {
    this.row = null;
    this.renameDirty = false;
  }

  /** Close the modal if the user may leave (a click outside, the cross): see `mayLeave`. */
  requestClose() {
    if (this.mayLeave()) this.closeModal();
  }

  closeModal() {
    this.modalOpen = false;
    this.row = null;
    this.renameDirty = false;
    this.over = null;
  }
}

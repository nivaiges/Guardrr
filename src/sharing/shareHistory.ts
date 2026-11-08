import { Platform, Share } from 'react-native';

import { SessionRecord, csvDateTime, historyCsv, historyShareTitle } from '../engine';

/** What happened when the performer tapped Share. */
export type ShareOutcome = 'shared' | 'dismissed' | 'downloaded' | 'unavailable';

/** "guardrr-history-2026-11-08.csv" */
export function historyFileName(nowMs: number): string {
  return `guardrr-history-${csvDateTime(nowMs).date}.csv`;
}

/** Web without a share sheet: save the CSV as a file instead. */
function download(csv: string, fileName: string): boolean {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/**
 * Open the phone's share sheet with the history as CSV text (Messages,
 * Mail, Notes, Files…). The text is the CSV itself, so it pastes straight
 * into a spreadsheet. On the web without a share sheet, it downloads a .csv.
 */
export async function shareHistory(
  history: readonly SessionRecord[],
  nowMs = Date.now(),
): Promise<ShareOutcome> {
  const csv = historyCsv(history);
  const title = historyShareTitle(history);
  const canShareOnWeb =
    Platform.OS !== 'web' || (typeof navigator !== 'undefined' && 'share' in navigator);
  if (canShareOnWeb) {
    try {
      const result = await Share.share({ title, message: csv }, { subject: title });
      return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
    } catch (e) {
      // The web share sheet throws when the performer closes it.
      if (e instanceof Error && e.name === 'AbortError') return 'dismissed';
      if (Platform.OS !== 'web') return 'unavailable';
    }
  }
  return download(csv, historyFileName(nowMs)) ? 'downloaded' : 'unavailable';
}

/** A short note for the History card after Share, or null when the sheet said it all. */
export function shareOutcomeMessage(outcome: ShareOutcome, nowMs = Date.now()): string | null {
  switch (outcome) {
    case 'downloaded':
      return `Saved ${historyFileName(nowMs)}`;
    case 'unavailable':
      return "Sharing isn't available on this device.";
    default:
      return null;
  }
}

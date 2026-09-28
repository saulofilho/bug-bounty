/**
 * Utility functions for computing and rendering side-by-side text diffs of HTTP response bodies
 */

export interface SideBySideDiffRow {
  leftLineNumber?: number;
  leftContent?: string;
  leftType?: 'unchanged' | 'removed' | 'empty';
  rightLineNumber?: number;
  rightContent?: string;
  rightType?: 'unchanged' | 'added' | 'empty';
  isModified?: boolean;
}

export interface DiffSummary {
  totalLeftLines: number;
  totalRightLines: number;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  modifiedCount: number;
  byteDelta: number;
  isIdentical: boolean;
}

/**
 * Attempts to parse and prettify JSON string; returns original string if not valid JSON
 */
export function tryFormatJson(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Computes side-by-side aligned diff rows using Longest Common Subsequence (LCS)
 */
export function computeSideBySideDiff(
  textA: string,
  textB: string,
  formatJson: boolean = true
): { rows: SideBySideDiffRow[]; summary: DiffSummary } {
  const contentA = formatJson ? tryFormatJson(textA) : textA;
  const contentB = formatJson ? tryFormatJson(textB) : textB;

  const linesA = contentA.split(/\r?\n/);
  const linesB = contentB.split(/\r?\n/);

  const m = linesA.length;
  const n = linesB.length;

  // LCS Dynamic Programming table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (linesA[i] === linesB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to find diff operations
  type DiffOp =
    | { type: 'equal'; lineA: string; lineB: string; lineNoA: number; lineNoB: number }
    | { type: 'remove'; lineA: string; lineNoA: number }
    | { type: 'add'; lineB: string; lineNoB: number };

  const ops: DiffOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      ops.push({
        type: 'equal',
        lineA: linesA[i - 1],
        lineB: linesB[j - 1],
        lineNoA: i,
        lineNoB: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({
        type: 'add',
        lineB: linesB[j - 1],
        lineNoB: j
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      ops.push({
        type: 'remove',
        lineA: linesA[i - 1],
        lineNoA: i
      });
      i--;
    }
  }

  ops.reverse();

  // Group contiguous removes and adds into paired rows
  const rows: SideBySideDiffRow[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;
  let modifiedCount = 0;

  let idx = 0;
  while (idx < ops.length) {
    const current = ops[idx];

    if (current.type === 'equal') {
      rows.push({
        leftLineNumber: current.lineNoA,
        leftContent: current.lineA,
        leftType: 'unchanged',
        rightLineNumber: current.lineNoB,
        rightContent: current.lineB,
        rightType: 'unchanged',
        isModified: false
      });
      unchangedCount++;
      idx++;
    } else {
      // Collect all contiguous removes
      const removes: Array<{ lineA: string; lineNoA: number }> = [];
      while (idx < ops.length && ops[idx].type === 'remove') {
        const item = ops[idx] as { type: 'remove'; lineA: string; lineNoA: number };
        removes.push({ lineA: item.lineA, lineNoA: item.lineNoA });
        idx++;
      }

      // Collect all contiguous adds
      const adds: Array<{ lineB: string; lineNoB: number }> = [];
      while (idx < ops.length && ops[idx].type === 'add') {
        const item = ops[idx] as { type: 'add'; lineB: string; lineNoB: number };
        adds.push({ lineB: item.lineB, lineNoB: item.lineNoB });
        idx++;
      }

      const maxCount = Math.max(removes.length, adds.length);
      for (let k = 0; k < maxCount; k++) {
        const rem = removes[k];
        const add = adds[k];

        if (rem && add) {
          rows.push({
            leftLineNumber: rem.lineNoA,
            leftContent: rem.lineA,
            leftType: 'removed',
            rightLineNumber: add.lineNoB,
            rightContent: add.lineB,
            rightType: 'added',
            isModified: true
          });
          modifiedCount++;
          removedCount++;
          addedCount++;
        } else if (rem) {
          rows.push({
            leftLineNumber: rem.lineNoA,
            leftContent: rem.lineA,
            leftType: 'removed',
            rightLineNumber: undefined,
            rightContent: undefined,
            rightType: 'empty',
            isModified: false
          });
          removedCount++;
        } else if (add) {
          rows.push({
            leftLineNumber: undefined,
            leftContent: undefined,
            leftType: 'empty',
            rightLineNumber: add.lineNoB,
            rightContent: add.lineB,
            rightType: 'added',
            isModified: false
          });
          addedCount++;
        }
      }
    }
  }

  const byteDelta = new Blob([contentB]).size - new Blob([contentA]).size;
  const isIdentical = addedCount === 0 && removedCount === 0;

  return {
    rows,
    summary: {
      totalLeftLines: linesA.length,
      totalRightLines: linesB.length,
      addedCount,
      removedCount,
      unchangedCount,
      modifiedCount,
      byteDelta,
      isIdentical
    }
  };
}

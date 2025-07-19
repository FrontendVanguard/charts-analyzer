import { DataStore } from "./App";

export const BLOCK_SIZE = 10000; // Block size for min/max precomputation

// Helper to compute min in a range [start, end] using block precomputed arrays
export function getRangeMin(
  data: DataStore,
  start: number,
  end: number
): number {
  const { y, blockMin } = data;
  if (start > end) return Infinity;
  const startBlock = Math.floor(start / BLOCK_SIZE);
  const endBlock = Math.floor(end / BLOCK_SIZE);
  let minVal = Infinity;
  if (startBlock === endBlock) {
    for (let i = start; i <= end; i++) {
      if (y[i] < minVal) minVal = y[i];
    }
    return minVal;
  }

  let startBlockEnd = (startBlock + 1) * BLOCK_SIZE - 1;
  for (let i = start; i <= Math.min(startBlockEnd, data.length - 1); i++) {
    if (y[i] < minVal) minVal = y[i];
  }

  for (let b = startBlock + 1; b <= endBlock - 1; b++) {
    const bMin = blockMin[b];
    if (bMin < minVal) minVal = bMin;
  }

  const endBlockStart = endBlock * BLOCK_SIZE;
  for (let i = endBlockStart; i <= end; i++) {
    if (y[i] < minVal) minVal = y[i];
  }
  return minVal;
}

// Helper to compute max in a range [start, end]
export function getRangeMax(
  data: DataStore,
  start: number,
  end: number
): number {
  const { y, blockMax } = data;
  if (start > end) return -Infinity;
  const startBlock = Math.floor(start / BLOCK_SIZE);
  const endBlock = Math.floor(end / BLOCK_SIZE);
  let maxVal = -Infinity;
  if (startBlock === endBlock) {
    for (let i = start; i <= end; i++) {
      if (y[i] > maxVal) maxVal = y[i];
    }
    return maxVal;
  }
  // Partial block from start to end of startBlock
  let startBlockEnd = (startBlock + 1) * BLOCK_SIZE - 1;
  for (let i = start; i <= Math.min(startBlockEnd, data.length - 1); i++) {
    if (y[i] > maxVal) maxVal = y[i];
  }
  // Whole blocks in between
  for (let b = startBlock + 1; b <= endBlock - 1; b++) {
    const bMax = blockMax[b];
    if (bMax > maxVal) maxVal = bMax;
  }
  // Partial block from beginning of endBlock to end index
  const endBlockStart = endBlock * BLOCK_SIZE;
  for (let i = endBlockStart; i <= end; i++) {
    if (y[i] > maxVal) maxVal = y[i];
  }
  return maxVal;
}

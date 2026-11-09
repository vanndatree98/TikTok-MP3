/**
 * Lightning Turbo Multi-Threaded Parallel Download Accelerator
 * ម៉ាស៊ីនទាញយកល្បឿនរន្ទះ - ពុះចែកជា 4 Streams ស្របគ្នា (Multi-Threaded Concurrent Byte-Range Chunker)
 * Provides maximum speed boost, real-time speedometer (MB/s), ETA calculation, and memory-safe chunk merging.
 */

export interface TurboThreadProgress {
  id: number;
  percent: number;
  downloaded: number;
  total: number;
}

export interface TurboProgressUpdate {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedMBs: number; // e.g. 24.5 MB/s
  etaSeconds: number;
  threads: TurboThreadProgress[];
  isTurboActive: boolean;
  statusText: string;
}

export interface TurboDownloadOptions {
  url: string;
  filename: string;
  format: 'mp4' | 'mp3';
  useTurbo?: boolean;
  threadCount?: number; // default 4
  onProgress?: (progress: TurboProgressUpdate) => void;
  signal?: AbortSignal;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export interface TurboDownloadResult {
  downloadedBytes: number;
  isTurbo: boolean;
}

/**
 * Download file using Turbo Multi-Threaded Concurrent Byte-Range Streams
 */
export async function downloadWithTurboEngine(options: TurboDownloadOptions): Promise<TurboDownloadResult> {
  const {
    url,
    filename,
    format,
    useTurbo = true,
    threadCount = 4,
    onProgress,
    signal
  } = options;

  const startTime = Date.now();
  let lastSampleTime = startTime;
  let lastSampleBytes = 0;
  let currentSpeedMBs = 0;

  const updateProgress = (
    downloaded: number,
    total: number,
    threads: TurboThreadProgress[],
    isTurbo: boolean,
    statusText: string
  ) => {
    const now = Date.now();
    const elapsedSinceLastSample = (now - lastSampleTime) / 1000;

    if (elapsedSinceLastSample >= 0.25 || downloaded === total) {
      const bytesDiff = downloaded - lastSampleBytes;
      if (elapsedSinceLastSample > 0) {
        const instantSpeed = (bytesDiff / (1024 * 1024)) / elapsedSinceLastSample;
        // Smooth rolling speed
        currentSpeedMBs = currentSpeedMBs === 0 ? instantSpeed : currentSpeedMBs * 0.7 + instantSpeed * 0.3;
      }
      lastSampleTime = now;
      lastSampleBytes = downloaded;
    }

    const remainingBytes = Math.max(0, total - downloaded);
    const etaSeconds = currentSpeedMBs > 0 ? Math.round((remainingBytes / (1024 * 1024)) / currentSpeedMBs) : 0;
    const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;

    onProgress?.({
      percent,
      downloadedBytes: downloaded,
      totalBytes: total,
      speedMBs: Math.max(0.1, Math.round(currentSpeedMBs * 10) / 10),
      etaSeconds,
      threads,
      isTurboActive: isTurbo,
      statusText
    });
  };

  let totalLength = 0;

  try {
    // 1. Send HEAD request to check file size and Range support
    let supportsRange = false;

    try {
      const headRes = await fetch(url, { method: 'HEAD', signal });
      if (headRes.ok) {
        const cl = headRes.headers.get('content-length');
        const ar = headRes.headers.get('accept-ranges');
        if (cl) totalLength = parseInt(cl, 10) || 0;
        if (ar && ar.toLowerCase().includes('bytes')) supportsRange = true;
      }
    } catch {
      // Ignore head failures, fallback to single stream
    }

    const isEligibleForTurbo =
      useTurbo &&
      format === 'mp4' &&
      supportsRange &&
      totalLength > 2 * 1024 * 1024 && // at least 2MB for multi-threading
      threadCount > 1;

    let finalBlob: Blob;

    if (isEligibleForTurbo) {
      // Multi-Threaded Concurrent Downloading
      const concurrency = Math.min(threadCount, 6);
      const chunkSize = Math.ceil(totalLength / concurrency);

      const threadsState: TurboThreadProgress[] = Array.from({ length: concurrency }, (_, i) => ({
        id: i + 1,
        percent: 0,
        downloaded: 0,
        total: Math.min(chunkSize, Math.max(0, totalLength - i * chunkSize))
      }));

      updateProgress(0, totalLength, threadsState, true, `⚡ បើកម៉ាស៊ីនរន្ទះ (${concurrency}x Threads Concurrent)`);

      // Spawn parallel chunk download promises
      const chunkPromises = Array.from({ length: concurrency }, async (_, i) => {
        const start = i * chunkSize;
        const end = Math.min(totalLength - 1, (i + 1) * chunkSize - 1);
        const chunkTotal = end - start + 1;
        threadsState[i].total = chunkTotal;

        const rangeHeader = `bytes=${start}-${end}`;
        const chunkRes = await fetch(url, {
          headers: { Range: rangeHeader },
          signal
        });

        if (!chunkRes.ok && chunkRes.status !== 206) {
          throw new Error(`Thread ${i + 1} range request failed: ${chunkRes.status}`);
        }

        const reader = chunkRes.body?.getReader();
        if (!reader) throw new Error(`Thread ${i + 1} stream body unavailable`);

        const parts: Uint8Array[] = [];
        let threadDownloaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            parts.push(value);
            threadDownloaded += value.length;
            threadsState[i].downloaded = threadDownloaded;
            threadsState[i].percent = Math.min(100, Math.round((threadDownloaded / chunkTotal) * 100));

            const currentTotalDownloaded = threadsState.reduce((sum, t) => sum + t.downloaded, 0);
            updateProgress(
              currentTotalDownloaded,
              totalLength,
              threadsState,
              true,
              `⚡ កំពុងទាញយកល្បឿនរន្ទះ (${concurrency}x Streams)`
            );
          }
        }

        // Return merged sub-chunk Uint8Array
        const mergedPart = new Uint8Array(threadDownloaded);
        let offset = 0;
        for (const p of parts) {
          mergedPart.set(p, offset);
          offset += p.length;
        }
        return mergedPart;
      });

      const downloadedSegments = await Promise.all(chunkPromises);
      finalBlob = new Blob(downloadedSegments, { type: 'video/mp4' });
    } else {
      // Single-Stream Fast Download (e.g. for MP3 audio or small videos)
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Server download response failed: ${res.status}`);

      const cl = res.headers.get('content-length');
      if (cl && !totalLength) totalLength = parseInt(cl, 10) || 0;

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Readable stream unavailable');

      const parts: Uint8Array[] = [];
      let downloaded = 0;

      const threadsState: TurboThreadProgress[] = [
        { id: 1, percent: 0, downloaded: 0, total: totalLength }
      ];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          parts.push(value);
          downloaded += value.length;
          threadsState[0].downloaded = downloaded;
          threadsState[0].percent = totalLength > 0 ? Math.min(100, Math.round((downloaded / totalLength) * 100)) : 50;

          updateProgress(
            downloaded,
            totalLength || downloaded,
            threadsState,
            false,
            format === 'mp3' ? 'កំពុងទាញយកសំឡេង MP3...' : 'កំពុងទាញយកវីដេអូ...'
          );
        }
      }

      finalBlob = new Blob(parts, { type: format === 'mp3' ? 'audio/mpeg' : 'video/mp4' });
    }

    // Trigger file download to disk
    const blobUrl = URL.createObjectURL(finalBlob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.setAttribute('download', filename);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);

    onProgress?.({
      percent: 100,
      downloadedBytes: finalBlob.size,
      totalBytes: finalBlob.size,
      speedMBs: currentSpeedMBs,
      etaSeconds: 0,
      threads: [],
      isTurboActive: isEligibleForTurbo,
      statusText: 'ការទាញយកបានជោគជ័យ ១០០%!'
    });

    return {
      downloadedBytes: finalBlob.size,
      isTurbo: isEligibleForTurbo
    };
  } catch (err: any) {
    if (signal?.aborted) {
      throw new Error('Download was cancelled');
    }
    console.warn('Turbo engine fallback to browser native anchor download:', err);
    // Fallback: trigger standard browser navigation download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', filename);
    anchor.setAttribute('target', '_blank');
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    return {
      downloadedBytes: totalLength || 0,
      isTurbo: false
    };
  }
}

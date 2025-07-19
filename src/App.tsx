import React, { useRef, useState, useEffect } from "react";
import { UPlotChart } from "./Chart";
import uPlot from "uplot";
import { BLOCK_SIZE, getRangeMax, getRangeMin } from "./algorithms";
import { FileLoader } from "./components/FileLoader";

export interface DataStore {
  x: number[];
  y: number[];
  prefixSum: number[];
  prefixSumSq: number[];
  blockMin: number[];
  blockMax: number[];
  length: number;
}

const App: React.FC = () => {
  const dataRef = useRef<DataStore | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);

  const [windowStart, setWindowStart] = useState<number>(0);
  const [windowSize, setWindowSize] = useState<number>(1000);
  const [stepSize, setStepSize] = useState<number>(10);
  const [intervalMs, setIntervalMs] = useState<number>(500);

  const [chartData, setChartData] = useState<uPlot.AlignedData | null>(null);

  const [statMin, setStatMin] = useState<number>(0);
  const [statMax, setStatMax] = useState<number>(0);
  const [statAvg, setStatAvg] = useState<number>(0);
  const [statVar, setStatVar] = useState<number>(0);

  // Async for responsive UI
  const parseFile = async (file: File) => {
    setLoading(true);

    const xVals: number[] = [];
    const yVals: number[] = [];
    const prefixSum: number[] = [];
    const prefixSumSq: number[] = [];
    const blockMinArr: number[] = [];
    const blockMaxArr: number[] = [];
    prefixSum.push(0);
    prefixSumSq.push(0);
    let runningSum = 0;
    let runningSumSq = 0;

    let currentBlockMin = Infinity;
    let currentBlockMax = -Infinity;
    let countInBlock = 0;

    const chunkSize = 1024 * 1024; // 1 MB per chunk (adjust as needed)
    const fileSize = file.size;
    let offset = 0;
    let leftover = "";

    const reader = new FileReader();

    const readChunk = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const blob = file.slice(offset, Math.min(offset + chunkSize, fileSize));
        reader.onload = () => {
          if (reader.result) resolve(reader.result as string);
          else reject(new Error("Failed to read file chunk"));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });
    };

    try {
      while (offset < fileSize) {
        const text = leftover + (await readChunk());
        offset += chunkSize;
        const lines = text.split("\n");

        if (offset < fileSize) {
          leftover = lines.pop() || "";
        } else {
          leftover = "";
        }
        for (const line of lines) {
          if (!line) continue;
          const [xStr, yStr] = line.split(",");
          const x = xStr ? Number(xStr) : NaN;
          const y = yStr ? Number(yStr) : NaN;
          if (Number.isNaN(x) || Number.isNaN(y)) {
            continue;
          }

          xVals.push(x);
          yVals.push(y);

          runningSum += y;
          runningSumSq += y * y;
          prefixSum.push(runningSum);
          prefixSumSq.push(runningSumSq);

          if (y < currentBlockMin) currentBlockMin = y;
          if (y > currentBlockMax) currentBlockMax = y;
          countInBlock++;
          if (countInBlock === BLOCK_SIZE) {
            blockMinArr.push(currentBlockMin);
            blockMaxArr.push(currentBlockMax);
            currentBlockMin = Infinity;
            currentBlockMax = -Infinity;
            countInBlock = 0;
          }
        }
      }
      if (countInBlock > 0) {
        blockMinArr.push(currentBlockMin);
        blockMaxArr.push(currentBlockMax);
      }
    } catch (err) {
      console.error("Error reading file:", err);
      setLoading(false);
      return;
    }

    const length = xVals.length;
    dataRef.current = {
      x: xVals,
      y: yVals,
      prefixSum: prefixSum,
      prefixSumSq: prefixSumSq,
      blockMin: blockMinArr,
      blockMax: blockMaxArr,
      length: length,
    };
    setLoading(false);

    const defaultWindow = length < 1000 ? length : 1000;
    setWindowStart(0);
    setWindowSize(defaultWindow);

    if (defaultWindow === windowSize) {
      updateChartAndStats(0, defaultWindow);
    }
  };

  const updateChartAndStats = (startIndex: number, size: number) => {
    if (!dataRef.current) return;
    const data = dataRef.current;
    const len = data.length;
    if (len === 0) return;

    let S = startIndex;
    if (S < 0) S = 0;
    if (S > len - 1) S = len - 1;
    let N = size;
    if (N < 1) N = 1;
    if (S + N > len) {
      N = len - S;
    }
    const endIndex = S + N - 1;

    const chartWidth = 800;
    let useDownsampling = N > chartWidth;

    const xArr: number[] = [];
    const lowArr: number[] = [];
    const highArr: number[] = [];
    const lineArr: number[] = [];
    if (useDownsampling) {
      const nOut = chartWidth;
      for (let i = 0; i < nOut; i++) {
        const segStart = S + Math.floor((i * N) / nOut);

        const segEnd =
          i === nOut - 1 ? endIndex : S + Math.floor(((i + 1) * N) / nOut) - 1;
        const segMin = getRangeMin(data, segStart, segEnd);
        const segMax = getRangeMax(data, segStart, segEnd);

        const sumRange = data.prefixSum[segEnd + 1] - data.prefixSum[segStart];
        const avg = sumRange / (segEnd - segStart + 1);

        const xVal = data.x[segStart];
        xArr.push(xVal);
        lowArr.push(segMin);
        highArr.push(segMax);
        lineArr.push(avg);
      }
    } else {
      for (let i = S; i <= endIndex; i++) {
        xArr.push(data.x[i]);
        const yVal = data.y[i];
        lowArr.push(yVal);
        highArr.push(yVal);
        lineArr.push(yVal);
      }
    }

    setChartData([xArr, lowArr, highArr, lineArr]);

    const minVal = getRangeMin(data, S, endIndex);
    const maxVal = getRangeMax(data, S, endIndex);
    const sum = data.prefixSum[endIndex + 1] - data.prefixSum[S];
    const sumSq = data.prefixSumSq[endIndex + 1] - data.prefixSumSq[S];
    const avg = sum / N;
    const variance = N > 0 ? sumSq / N - avg * avg : 0;
    setStatMin(minVal);
    setStatMax(maxVal);
    setStatAvg(avg);
    setStatVar(variance);
  };

  useEffect(() => {
    if (!dataRef.current) return;
    const len = dataRef.current.length;
    if (len === 0) return;
    let S = windowStart;
    let N = windowSize;
    if (S < 0) S = 0;
    if (S > len - 1) S = len - 1;
    if (N < 1) N = 1;
    if (S + N > len) N = len - S;
    if (S !== windowStart) {
      setWindowStart(S);
      return;
    }
    if (N !== windowSize) {
      setWindowSize(N);
      return;
    }
    updateChartAndStats(S, N);
  }, [windowStart, windowSize]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setWindowStart((prevStart) => {
        if (!dataRef.current) return prevStart;
        const len = dataRef.current.length;
        if (prevStart >= len - 1) {
          setPlaying(false);
          return prevStart;
        }
        let newStart = prevStart + stepSize;
        if (newStart > len - 1) newStart = len - 1;
        if (newStart === prevStart) {
          setPlaying(false);
        }
        return newStart;
      });
    }, intervalMs);
    return () => {
      clearInterval(id);
    };
  }, [playing, stepSize, intervalMs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlaying(false);
    setFileName(file.name);
    dataRef.current = null;
    setChartData(null);
    parseFile(file);
  };

  const handleLoadTest = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/data_points.csv");
      const blob = await resp.blob();
      const file = new File([blob], "data_points.csv", { type: blob.type });
      await parseFile(file);
      setFileName("data_points.csv");
    } catch (err) {
      console.error("Ошибка загрузки тестового файла:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "1rem" }}>
      <h1>Data Plot Viewer</h1>
      <FileLoader
        onSelect={handleFileChange}
        onLoadTest={handleLoadTest}
        disabled={false}
        fileName={fileName}
      />
      {loading && <p>Loading data, please wait...</p>}
      <div style={{ margin: "1rem 0" }}>
        <label>
          Window Start (S):{" "}
          <input
            type="number"
            value={windowStart}
            onChange={(e) => setWindowStart(Number(e.target.value))}
            disabled={!dataRef.current || loading || playing}
          />
        </label>{" "}
        <label>
          Window Size (N):{" "}
          <input
            type="number"
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
            disabled={!dataRef.current || loading || playing}
          />
        </label>{" "}
        <label>
          Step (P):{" "}
          <input
            type="number"
            value={stepSize}
            onChange={(e) => setStepSize(Number(e.target.value))}
            disabled={!dataRef.current || loading}
          />
        </label>{" "}
        <label>
          Interval (T ms):{" "}
          <input
            type="number"
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            disabled={!dataRef.current || loading}
          />
        </label>{" "}
        <button
          onClick={() => setPlaying((prev) => !prev)}
          disabled={!dataRef.current || loading}
        >
          {playing ? "Stop" : "Start"}
        </button>
      </div>
      {chartData && dataRef.current && !loading && (
        <div>
          <UPlotChart data={chartData} />
          <div style={{ marginTop: "0.5rem" }}>
            <strong>
              Shown Data (indices {windowStart} to{" "}
              {Math.min(
                windowStart + windowSize - 1,
                dataRef.current.length - 1
              )}
              ):
            </strong>
            <br />
            Min: {statMin.toFixed(6)} &nbsp; Max: {statMax.toFixed(6)} &nbsp;
            Avg: {statAvg.toFixed(6)} &nbsp; Var: {statVar.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

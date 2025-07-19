import React from "react";
import uPlot from "uplot";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

const options: uPlot.Options = {
  title: "Data Series",
  width: 800,
  height: 400,
  pxAlign: 0,
  scales: {
    x: { time: false },
  },
  series: [
    {},
    {
      label: "Low",
      stroke: "rgba(0, 123, 255, 0)",
      fill: "rgba(0, 123, 255, 0.3)",
      band: true,
      pxAlign: 0,
    },
    {
      label: "High",
      stroke: "rgba(0, 123, 255, 0)",
      fill: "rgba(0, 123, 255, 0.3)",
      band: true,
      pxAlign: 0,
    },
    {
      label: "Value",
      stroke: "rgba(0, 123, 255, 1)",
      width: 1,
      pxAlign: 0,
    },
  ],
  axes: [
    {
      stroke: "#666",
      grid: { show: true, stroke: "#ccc" },
    },
    {
      stroke: "#666",
      grid: { show: true, stroke: "#eee" },
      label: "Y",
    },
  ],
};

interface ChartProps {
  data: uPlot.AlignedData;
}

export const UPlotChart: React.FC<ChartProps> = ({ data }) => {
  return (
    <div>
      <UplotReact options={options} data={data} />
    </div>
  );
};

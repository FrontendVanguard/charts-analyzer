import React from "react";

interface Props {
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadTest: () => void;
  disabled: boolean;
  fileName: string | null;
}

export const FileLoader: React.FC<Props> = ({
  onSelect,
  onLoadTest,
  disabled,
  fileName,
}) => (
  <div>
    <input type="file" accept=".csv" onChange={onSelect} disabled={disabled} />
    <button onClick={onLoadTest} disabled={disabled}>
      Choose Test File
    </button>
    {fileName && <span>File: {fileName}</span>}
  </div>
);

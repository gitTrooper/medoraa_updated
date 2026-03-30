import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const ProgressCircle = ({ percentage }) => {
  return (
    <div style={{ width: 100, height: 100 }}>
      <CircularProgressbar
        value={percentage}
        text={`${percentage}%`}
        styles={buildStyles({
          textColor: "#000",
          pathColor: "#007bff",
          trailColor: "#ddd",
          textSize: "16px",
          strokeLinecap: "round",
        })}
      />
    </div>
  );
};
export default ProgressCircle;

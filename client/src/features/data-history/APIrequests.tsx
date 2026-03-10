
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  weeklyApiRequests: number[];
}

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
//גרף עמודות
const WeeklyApiBarChart: React.FC<Props> = ({ weeklyApiRequests }) => {
  const data = weeklyApiRequests.map((value, i) => ({
    day: days[i] || "",
    value
  }));

  return (
    <div style={{ width: "100%", height: 400 }}>
      <h2>גרף בקשות API שבועי</h2>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4E8CF7" barSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyApiBarChart;

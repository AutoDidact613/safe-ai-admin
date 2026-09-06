






import React from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface Props {
  weeklyChatCounts: number[];
}

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const WeeklyChatsChart: React.FC<Props> = ({ weeklyChatCounts }) => {
  const { t } = useTranslation();
  const chartData = DAY_KEYS.map((dayKey, i) => ({
    day: t(`weekDays.${dayKey}`),
    chats: weeklyChatCounts[i] || 0
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <h2>{t("dataHistory.weeklyChatsChartTitle")}</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="chats" stroke="#8884d8" name={t("dataHistory.chatsLegendLabel")} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyChatsChart;

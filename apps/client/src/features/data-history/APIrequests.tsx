
import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  weeklyApiRequests: number[];
}

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
//גרף עמודות
const WeeklyApiBarChart: React.FC<Props> = ({ weeklyApiRequests }) => {
  const { t } = useTranslation();
  const data = weeklyApiRequests.map((value, i) => ({
    day: DAY_KEYS[i] ? t(`weekDays.${DAY_KEYS[i]}`) : "",
    value
  }));

  return (
    <div style={{ width: "100%", height: 400 }}>
      <h2>{t("dataHistory.weeklyApiChartTitle")}</h2>
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

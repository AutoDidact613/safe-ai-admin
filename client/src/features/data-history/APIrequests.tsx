// import React from "react";
// import { useSelector } from "react-redux";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer
// } from "recharts";

// // הגדרת המבנה של ה-Store (מומלץ לייבא את RootState מה-store.ts המרכזי שלך)
// interface RootState {
//   historyS: {
//     weeklyApiRequests: number[];
//   };
// }

// // הגדרת המבנה של הנתונים עבור הגרף
// interface ChartData {
//   day: string;
//   value: number;
// }

// const WeeklyApiBarChart: React.FC = () => {
//   // שליפת הנתונים עם וידוא שהם קיימים
//   const weeklyApiRequests = useSelector(
//     (state: RootState) => state.historyS.weeklyApiRequests
//   );

//   const days: string[] = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

//   // בניית הנתונים לגרף תוך בדיקה שהמערך קיים לפני ה-map
//   const data: ChartData[] = (weeklyApiRequests || []).map((value: number, index: number) => ({
//     day: days[index] || "",
//     value,
//   }));

//   return (
//     <div style={{ width: "50%", height: "400px" }}>
//       <ResponsiveContainer width="100%" height="100%">
//         <BarChart data={data}>
//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis dataKey="day" />
//           <YAxis />
//           <Tooltip />
//           <Bar dataKey="value" fill="#4E8CF7" barSize={50} />
//         </BarChart>
//       </ResponsiveContainer>
//     </div>
//   );
// };

// export default WeeklyApiBarChart;



import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  weeklyApiRequests: number[];
}

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

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

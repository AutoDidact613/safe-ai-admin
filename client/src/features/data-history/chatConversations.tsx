
// import React from "react";
// import { useSelector } from "react-redux";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
// } from "recharts";

// // שמות הימים להצגה על ציר X
// const daysOfWeek = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// const WeeklyChatsChart = () => {
//   const weeklyChatCounts = useSelector((state) => state.historyS.weeklyChatCounts);

//   // המרה למערך של אובייקטים שמתאים לגרף
//   const chartData = daysOfWeek.map((day, index) => ({
//     day,
//     chats: weeklyChatCounts[index],
//   }));

//   return (//עיצוב הגרף
//     <div>
//       <h2>גרף שיחות שבועי</h2>
//       <ResponsiveContainer width="100%" height={300}>
//         <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis dataKey="day" />
//           <YAxis />
//           <Tooltip />
//           <Legend />
//           <Line type="monotone" dataKey="chats" stroke="#8884d8" name="שיחות" />
//         </LineChart>
//       </ResponsiveContainer>
//     </div>
//   );
// };

// export default WeeklyChatsChart;





import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface Props {
  weeklyChatCounts: number[];
}

const daysOfWeek = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const WeeklyChatsChart: React.FC<Props> = ({ weeklyChatCounts }) => {
  const chartData = daysOfWeek.map((day, i) => ({
    day,
    chats: weeklyChatCounts[i] || 0
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <h2>גרף שיחות שבועי</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="chats" stroke="#8884d8" name="שיחות" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyChatsChart;




// import { useSelector } from "react-redux";
// import {
//   AreaChart,
//   Area,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   Legend
// } from "recharts";

// interface RootState {
//   historyS: {
//     weeklyNewUsers: number[];
//   };
// }

// interface UserChartData {
//   day: string;
//   users: number;
// }

// export default function WeeklyNewUsersAreaChart() {
//   const weeklyNewUsers = useSelector((state: RootState) => state.historyS.weeklyNewUsers) || [];

//   const days: string[] = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

//   const data: UserChartData[] = weeklyNewUsers.map((value, index) => ({
//     day: days[index],
//     users: value,
//   }));

//   return (
//     <div style={{ width: "100%", height: 350 }}>
//       <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
//         משתמשים חדשים שנוספו השבוע
//       </h3>

//       <ResponsiveContainer>
//         <AreaChart data={data}>
//           <defs>
//             <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="10%" stopColor="#00aaff" stopOpacity={0.7} />
//               <stop offset="95%" stopColor="#00aaff" stopOpacity={0.1} />
//             </linearGradient>
//           </defs>

//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis dataKey="day" />
//           <YAxis />
//           <Tooltip />
//           <Legend />

//           <Area
//             type="monotone"
//             dataKey="users"
//             stroke="#0088ff"
//             fill="url(#colorUsers)"
//             strokeWidth={3}
//           />
//         </AreaChart>
//       </ResponsiveContainer>
//     </div>
//   );
// }


import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface Props {
  weeklyNewUsers: number[];
}

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const WeeklyNewUsersAreaChart: React.FC<Props> = ({ weeklyNewUsers }) => {
  const data = weeklyNewUsers.map((value, i) => ({
    day: days[i],
    users: value
  }));

  return (
    <div style={{ width: "100%", height: 350 }}>
      <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
        משתמשים חדשים שנוספו השבוע
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor="#00aaff" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#00aaff" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="users" stroke="#0088ff" fill="url(#colorUsers)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyNewUsersAreaChart;

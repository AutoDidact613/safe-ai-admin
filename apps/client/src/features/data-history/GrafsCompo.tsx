// import WeeklyApiBarChart from "./APIrequests";
// import WeeklyChatsChart from "./chatConversations";
// import WeeklyNewUsersAreaChart from "./ContNewUesrWeek";

// function GrafsCompo() {
//   return <>
//   <p></p>
//    <div>
      
//       <WeeklyChatsChart />
//       <br />
//       <br />
//       <br />
//       <WeeklyApiBarChart />
//       <WeeklyNewUsersAreaChart />
     
//     </div>
//   </>
// }

//////////////////////////////////////////


import React from "react";
import { useSelector } from "react-redux";
import WeeklyApiBarChart from "./APIrequests";
import WeeklyChatsChart from "./chatConversations";
import WeeklyNewUsersAreaChart from "./ContNewUesrWeek";
import type { RootState } from "../../app/store";

const GrafsCompo: React.FC = () => {
  // שליפת כל הנתונים מה-store במקום כל קומפוננטה לקרוא לבד
  const history = useSelector((state: RootState) => state.historys);

  // בדיקה שהכל קיים
  const weeklyChatCounts = history?.weeklyChatCounts ?? [];
  const weeklyApiRequests = history?.weeklyApiRequests ?? [];
  const weeklyNewUsers = history?.weeklyNewUsers ?? [];

  return (
    <div style={{ width: "100%", margin: "0 auto" }}>
      <WeeklyChatsChart weeklyChatCounts={weeklyChatCounts} />
      <br />
      <WeeklyApiBarChart weeklyApiRequests={weeklyApiRequests} />
      <br />
      <WeeklyNewUsersAreaChart weeklyNewUsers={weeklyNewUsers} />
    </div>
  );
};

export default GrafsCompo;

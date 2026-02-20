// import React, { useState } from "react"; 
// import { useSelector } from "react-redux";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";

// const TableView = () => {
//   // ------------------- נתונים מה-slice -------------------
//   const userTable = useSelector(state => state.table.userTable);
//   const groupTable = useSelector(state => state.table.groupTable);

//   // ------------------- סטייט לחיפוש -------------------
//   const [userSearch, setUserSearch] = useState("");
//   const [groupSearch, setGroupSearch] = useState("");

//   // ------------------- פילטר לפי חיפוש -------------------
//   const filteredUsers = userTable.filter(u => 
//     u.name.toLowerCase().includes(userSearch.toLowerCase())
//   );

//   const filteredGroups = groupTable.filter(g => 
//     g.name.toLowerCase().includes(groupSearch.toLowerCase())
//   );

//   // ------------------- יצוא אקסל משתמשים -------------------
//   const exportUserTable = () => {
//     const worksheet = XLSX.utils.json_to_sheet(filteredUsers);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//     const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
//     saveAs(blob, "user-table.xlsx");
//   };

//   // ------------------- יצוא אקסל קבוצות -------------------
//   const exportGroupTable = () => {
//     const worksheet = XLSX.utils.json_to_sheet(filteredGroups);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Groups");
//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//     const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
//     saveAs(blob, "group-table.xlsx");
//   };

//   // ------------------- רינדור -------------------
//   return (
//     <div style={{ width: "500px", margin: "0 auto" }}>

//       {/* ------------------- טבלת משתמשים ------------------- */}
//       <h2>טבלת משתמשים</h2>

//       <input
//         type="text"
//         placeholder="חפש משתמש לפי שם"
//         value={userSearch}
//         onChange={e => setUserSearch(e.target.value)}
//         style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
//       />

//       <table border="1" width="100%">
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>שם</th>
//             <th>גיל</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredUsers.map(u => (
//             <tr key={u.id}>
//               <td>{u.id}</td>
//               <td>{u.name}</td>
//               <td>{u.age}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <button
//         onClick={exportUserTable}
//         style={{ marginTop: "10px", padding: "8px 15px", cursor: "pointer" }}
//       >
//         יצוא משתמשים לאקסל
//       </button>

//       <hr style={{ margin: "30px 0" }} />

//       {/* ------------------- טבלת קבוצות ------------------- */}
//       <h2>טבלת קבוצות</h2>

//       <input
//         type="text"
//         placeholder="חפש קבוצות לפי שם"
//         value={groupSearch}
//         onChange={e => setGroupSearch(e.target.value)}
//         style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
//       />

//       <table border="1" width="100%">
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>שם</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredGroups.map(g => (
//             <tr key={g.id}>
//               <td>{g.id}</td>
//               <td>{g.name}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <button
//         onClick={exportGroupTable}
//         style={{ marginTop: "10px", padding: "8px 15px", cursor: "pointer" }}
//       >
//         יצוא קבוצות לאקסל
//       </button>

//     </div>
//   );
// };

// export default TableView;

import React, { useState, type ChangeEvent } from "react";
import { useSelector } from "react-redux";
// השתקה של שגיאת הייבוא כדי למנוע את הסימון האדום
// @ts-ignore
import * as XLSX from "xlsx";
// @ts-ignore
import { saveAs } from "file-saver";
// הגדרת מבנה הסטייט כדי ש-useSelector לא יצעק
interface RootState  {
  table: {
    userTable: Array<{ id: number; name: string; age: number }>;
    groupTable: Array<{ id: number; name: string }>;
  };
}

const TableView: React.FC = () => {
  // ------------------- נתונים מה-slice -------------------
  // הגדרת טיפוס state: any ליתר ביטחון אם ה-RootState לא תואם בדיוק
  const userTable = useSelector((state: any) => state.table.userTable);
  const groupTable = useSelector((state: any) => state.table.groupTable);

  // ------------------- סטייט לחיפוש -------------------
  const [userSearch, setUserSearch] = useState<string>("");
  const [groupSearch, setGroupSearch] = useState<string>("");

  // ------------------- פילטר לפי חיפוש -------------------
  const filteredUsers = userTable.filter((u: any) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredGroups = groupTable.filter((g: any) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // ------------------- יצוא אקסל משתמשים -------------------
  const exportUserTable = (): void => {
    const worksheet = XLSX.utils.json_to_sheet(filteredUsers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "user-table.xlsx");
  };

  // ------------------- יצוא אקסל קבוצות -------------------
  const exportGroupTable = (): void => {
    const worksheet = XLSX.utils.json_to_sheet(filteredGroups);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Groups");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "group-table.xlsx");
  };

  // ------------------- רינדור -------------------
  return (
    <div style={{ width: "500px", margin: "0 auto", direction: "rtl" }}>

      {/* ------------------- טבלת משתמשים ------------------- */}
      <h2>טבלת משתמשים</h2>

      <input
        type="text"
        placeholder="חפש משתמש לפי שם"
        value={userSearch}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
      />

      <table border={1} width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>שם</th>
            <th>גיל</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((u: any) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.age}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={exportUserTable}
        style={{ marginTop: "10px", padding: "8px 15px", cursor: "pointer" }}
      >
        יצוא משתמשים לאקסל
      </button>

      <hr style={{ margin: "30px 0" }} />

      {/* ------------------- טבלת קבוצות ------------------- */}
      <h2>טבלת קבוצות</h2>

      <input
        type="text"
        placeholder="חפש קבוצות לפי שם"
        value={groupSearch}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
      />

      <table border={1} width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>שם</th>
          </tr>
        </thead>
        <tbody>
          {filteredGroups.map((g: any) => (
            <tr key={g.id}>
              <td>{g.id}</td>
              <td>{g.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={exportGroupTable}
        style={{ marginTop: "10px", padding: "8px 15px", cursor: "pointer" }}
      >
        יצוא קבוצות לאקסל
      </button>

    </div>
  );
};

export default TableView;
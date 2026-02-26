import React, { useState } from "react";
import { useSelector } from "react-redux";
import { ApiCard } from "./ApiCard";
import { AddApi } from "./AddApi";
import type { RootState } from '../app/store';  // תוודא שיש לך הגדרה כזו במקום המתאים

export const ApiList: React.FC = () => {
  const apiList = useSelector((state: RootState) => state.api.api);
  const [showAddApi, setShowAddApi] = useState<boolean>(false);

  return (
    <div>
      <button onClick={() => setShowAddApi(true)}>צור API keys</button>

      {apiList.map((api) => (
        <ApiCard key={api.id} api={api} />
      ))}

      {showAddApi && <AddApi onClose={() => setShowAddApi(false)} />}

      {showAddApi && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
          onClick={() => setShowAddApi(false)}
        />
      )}
    </div>
  );
};

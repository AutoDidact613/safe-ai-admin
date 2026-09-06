import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { promptUpdated } from "./FilterManagementSlice";

type PromptStatus = "active" | "not active";

type Prompt = {
  id: number;
  groupId: string;
  content: string;
  Status: PromptStatus;
};

const EditPromptPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const prompt = useAppSelector((state) =>
    state.filterManagement.groupPrompts.find(
      (p: Prompt) => p.id === Number(id)
    )
  ) as Prompt | undefined;

  if (!prompt) return <div>{t("filterManagement.promptNotFound")}</div>;

  const handleSave = (updated: Prompt) => {
    dispatch(promptUpdated(updated));
    navigate(-1);
  };

  return (
    <EditPromptForm
      key={prompt.id}
      prompt={prompt}
      onCancel={() => navigate(-1)}
      onSave={handleSave}
    />
  );
};

function EditPromptForm({
  prompt,
  onSave,
  onCancel,
}: {
  prompt: Prompt;
  onSave: (p: Prompt) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [groupId, setGroupId] = useState<string>(prompt.groupId);
  const [content, setContent] = useState<string>(prompt.content);
  const [status, setStatus] = useState<PromptStatus>(prompt.Status);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    onSave({
      id: prompt.id,
      groupId,
      content,
      Status: status,
    });
  };

  return (
    <div className="prompt-container" style={{ padding: "20px" }}>
      <h2>{t("filterManagement.editPromptTitle")}</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Group ID: </label>
          <input
            type="text"
            value={groupId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGroupId(e.target.value)
            }
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Content: </label>
          <input
            type="text"
            value={content}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setContent(e.target.value)
            }
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Status: </label>
          <select
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStatus(e.target.value as PromptStatus)
            }
          >
            <option value="active">{t("filterManagement.activeOption")}</option>
            <option value="not active">{t("filterManagement.notActiveOption")}</option>
          </select>
        </div>

        <button type="submit">{t("usersManagement.saveChangesButton")}</button>
        <button
          type="button"
          onClick={onCancel}
          style={{ marginLeft: "10px" }}
        >
          {t("common.cancel")}
        </button>
      </form>
    </div>
  );
}

export default EditPromptPage;

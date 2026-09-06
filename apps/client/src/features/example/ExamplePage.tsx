import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { increment, addBy } from "./exampleSlice";

export default function ExamplePage() {
  const { t } = useTranslation();
  const counter = useAppSelector((s) => s.example.counter);
  const dispatch = useAppDispatch();

  return (
    <div style={{ padding: 24 }}>
      <h2>{t("examplePage.title")}</h2>
      <p>Counter: {counter}</p>

      <button  className="btn btn-primary" onClick={() => dispatch(increment())}>+1</button>
      <button  className="btn btn-secondary" onClick={() => dispatch(addBy(5))}>+5</button>
    </div>
  );
}

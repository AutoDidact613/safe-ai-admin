import { SEO } from "../components/SEO";

export default function NotFound() {
  return(
  <>
        <SEO title="הדף לא נמצא" noIndex={true} />
   <h2>404 – הדף לא נמצא</h2>;
  </>
  );
}

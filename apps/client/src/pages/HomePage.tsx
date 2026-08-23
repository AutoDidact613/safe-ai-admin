export default function HomePage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the LLM Management Platform.</p>

      <div style={{ marginTop: 24 }}>
        <strong>Status</strong>
        <ul>
          <li>Users: —</li>
          <li>Active sessions: —</li>
          <li>Usage today: —</li>
        </ul>
      </div>
    </div>
  );
}

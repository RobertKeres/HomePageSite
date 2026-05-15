import { useAppConfig } from "../configContext";

export function WorkspaceBar() {
  const { config, setActiveWorkspace, addWorkspace } = useAppConfig();

  return (
    <div className="workspace-tabs">
      {config.workspaces.map((ws) => (
        <button
          key={ws.id}
          type="button"
          className="ws-tab"
          data-active={ws.id === config.activeWorkspaceId}
          onClick={() => setActiveWorkspace(ws.id)}
        >
          {ws.name}
        </button>
      ))}
      <button type="button" className="ws-tab" onClick={addWorkspace}>
        + New
      </button>
    </div>
  );
}

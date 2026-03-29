import { useAuth } from "../../../contexts/AuthContext";
import { AvatarLabelGroup } from "../../base/avatar/avatar-label-group";
import capicuLogo from "../../../assets/bc28cd3b23be4b191421f0ead27bb2b9b7c23ff5.png";

interface TopBarProps {
  currentProject?: string;
  projects?: Array<{ id: string; name: string }>;
  onProjectChange?: (projectId: string) => void;
}

export function TopBar(_: TopBarProps) {
  const { user } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 h-[60px] bg-background border-b border-border flex items-center justify-between px-3 z-40">
      <div className="flex items-center gap-4">
        <img
          src={capicuLogo}
          alt="Capicú"
          className="h-8 w-auto"
        />
        <h1 className="text-xl font-semibold text-foreground m-0">
          Capicú <span className="text-destructive">Edge ML</span> Inference
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <AvatarLabelGroup
            size="md"
            title={user.name || user.username || "User"}
            subtitle={user.email || user.username || ""}
            fallback={(user.name || user.username || "U").charAt(0).toUpperCase()}
          />
        )}
      </div>
    </div>
  );
}

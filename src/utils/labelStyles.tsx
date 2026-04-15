import {
  CheckCircle,
  Clock,
  Lock,
  Inbox,
  Eye,
  AlertTriangle,
  Circle,
} from "lucide-react";

export const getPriorityBadgeClasses = (priority: string) => {
  switch (priority) {
    case "High":
      return "border border-red-500 text-red-500 bg-transparent";
    case "Medium":
      return "border border-orange-500 text-orange-500 bg-transparent";
    case "Low":
      return "border border-emerald-500 text-emerald-500 bg-transparent";
    default:
      return "border border-white/10 text-[var(--muted)] bg-transparent";
  }
};

export const getStatusMeta = (statusName: string) => {
  switch (statusName) {
    case "Resolved":
      return {
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
        labelClass:
          "border border-emerald-500 text-emerald-500 bg-transparent",
      };
    case "In Progress":
      return {
        icon: <Clock className="h-4 w-4 text-orange-500" />,
        labelClass:
          "border border-orange-500 text-orange-500 bg-transparent",
      };
    case "Open":
      return {
        icon: <Inbox className="h-4 w-4 text-sky-500" />,
        labelClass: "border border-sky-500 text-sky-500 bg-transparent",
      };
    case "Closed":
      return {
        icon: <Lock className="h-4 w-4 text-[var(--muted)]" />,
        labelClass:
          "border border-[var(--muted)] text-[var(--muted)] bg-transparent",
      };
    case "Ready for QA":
      return {
        icon: <Eye className="h-4 w-4 text-[#8B5CF6]" />,
        labelClass:
          "border border-[#8B5CF6] text-[#8B5CF6] bg-transparent",
      };
    case "Error Persists":
      return {
        icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
        labelClass:
          "border border-rose-500 text-rose-500 bg-transparent",
      };
    default:
      return {
        icon: <Circle className="h-4 w-4 text-[var(--muted)]" />,
        labelClass:
          "border border-[var(--muted)] text-[var(--muted)] bg-transparent",
      };
  }
};

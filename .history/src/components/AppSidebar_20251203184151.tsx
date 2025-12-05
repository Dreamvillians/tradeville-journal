import { 
  BarChart3, 
  BookOpen, 
  Home, 
  TrendingUp, 
  Target, 
  Settings, 
  LogOut,
  User
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Playbook", url: "/playbook", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Goals & Habits", url: "/goals-habits", icon: Target },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-white/5 bg-[#0a0b0f]/95 backdrop-blur-xl transition-all duration-300"
    >
      {/* Header / Logo */}
      <div className={cn(
        "flex items-center h-[80px] px-6 border-b border-white/5 transition-all",
        isCollapsed ? "justify-center px-2" : "justify-start"
      )}>
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        
        {!isCollapsed && (
          <div className="ml-3 overflow-hidden whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="text-xl font-bold text-white tracking-tight">Tradeville</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Pro Journal</p>
          </div>
        )}
      </div>

      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-3">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                        isActive 
                          ? "bg-white/5 text-white shadow-inner border border-white/5" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active Indicator Line */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                          )}

                          {/* Icon with Glow on Active */}
                          <div className={cn(
                            "relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                            isActive && "text-blue-400"
                          )}>
                            <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]")} />
                          </div>

                          {/* Label */}
                          {!isCollapsed && (
                            <span className={cn(
                              "font-medium text-sm tracking-wide relative z-10 transition-all",
                              isActive ? "translate-x-1" : "translate-x-0"
                            )}>
                              {item.title}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer / User Profile */}
      <SidebarFooter className="border-t border-white/5 p-4">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer group",
          isCollapsed ? "justify-center" : "justify-start"
        )}>
          <Avatar className="w-9 h-9 border border-white/10 shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">Trader</p>
              <p className="text-xs text-gray-500 truncate">Pro Plan</p>
            </div>
          )}
          
          {!isCollapsed && (
            <Settings className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
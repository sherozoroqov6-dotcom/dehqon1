import { useGetBotStats, getGetBotStatsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Microscope, Activity, CalendarDays, Bug, Sprout } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetBotStats({
    query: { queryKey: getGetBotStatsQueryKey() }
  });
  
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Farmers" 
          value={stats?.totalUsers} 
          icon={Users} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Analyses" 
          value={stats?.totalAnalyses} 
          icon={Microscope} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Today's Scans" 
          value={stats?.todayAnalyses} 
          icon={CalendarDays} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Active (7d)" 
          value={stats?.activeUsers7d} 
          icon={Activity} 
          loading={statsLoading} 
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent Field Reports</h2>
          <Link href="/analyses" className="text-sm text-primary hover:underline font-medium">
            View all →
          </Link>
        </div>
        
        <Card className="overflow-hidden border-border bg-card">
          {activityLoading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-sm" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activity?.items?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              No recent activity found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.items.map(item => (
                <Link key={item.id} href={`/analyses/${item.id}`} className="flex items-center p-4 hover:bg-secondary/50 transition-colors group">
                  <div className="w-12 h-12 shrink-0 rounded bg-secondary flex items-center justify-center mr-4 border border-border overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="Crop" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <Sprout className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-foreground truncate">
                        {item.firstName || item.username || "Unknown Farmer"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center space-x-2">
                      <span className="truncate">{item.cropType || "Unknown Crop"}</span>
                      {item.diseaseDetected && (
                        <>
                          <span>•</span>
                          <span className="text-destructive flex items-center">
                            <Bug className="w-3 h-3 mr-1" />
                            Disease Detected
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 shrink-0">
                    {item.severity && (
                      <Badge variant="outline" className={
                        item.severity === "og'ir" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        item.severity === "o'rtacha" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                        "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      }>
                        {item.severity}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading }: { title: string, value?: number, icon: any, loading: boolean }) {
  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="w-4 h-4 text-primary/60" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-mono font-bold text-foreground">
            {value?.toLocaleString() || "0"}
          </div>
        )}
      </div>
    </Card>
  );
}

import { useListBotUsers, getListBotUsersQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Users() {
  const { data, isLoading } = useListBotUsers({ limit: 50 }, {
    query: { queryKey: getListBotUsersQueryKey({ limit: 50 }) }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Farmers (Users)</h2>
        <Badge variant="outline" className="font-mono text-primary border-primary/20 bg-primary/5">
          {data?.total || 0} TOTAL
        </Badge>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Farmer Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Telegram ID</TableHead>
              <TableHead className="text-right">Analyses</TableHead>
              <TableHead className="text-right">First Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 ml-auto rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !data?.users?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data.users.map((user) => (
                <TableRow key={user.id} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium">
                    {user.firstName || "-"} {user.lastName || ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.username ? `@${user.username}` : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.telegramId}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-mono bg-secondary text-foreground">
                      {user.analysisCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground font-mono">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useListAnalyses, getListAnalysesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Analyses() {
  const { data, isLoading } = useListAnalyses({ limit: 50 }, {
    query: { queryKey: getListAnalysesQueryKey({ limit: 50 }) }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All Analyses</h2>
        <Badge variant="outline" className="font-mono text-primary border-primary/20 bg-primary/5">
          {data?.total || 0} TOTAL
        </Badge>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Crop Type</TableHead>
              <TableHead>Farmer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !data?.analyses?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No analyses found.
                </TableCell>
              </TableRow>
            ) : (
              data.analyses.map((analysis) => (
                <TableRow key={analysis.id} className="border-border hover:bg-secondary/30 transition-colors group cursor-pointer">
                  <TableCell>
                    <Link href={`/analyses/${analysis.id}`} className="block">
                      {analysis.imageUrl ? (
                        <div className="w-10 h-10 rounded bg-secondary overflow-hidden border border-border/50">
                          <img src={analysis.imageUrl} alt="Crop" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center border border-border/50 text-muted-foreground text-xs font-mono">
                          N/A
                        </div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/analyses/${analysis.id}`} className="block">
                      {analysis.cropType || "Unknown"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/analyses/${analysis.id}`} className="block">
                      {analysis.firstName || analysis.username || "Unknown"}
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {analysis.telegramId}</div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/analyses/${analysis.id}`} className="block">
                      {analysis.diseaseDetected ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[10px] uppercase tracking-wider">
                          Infected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 font-mono text-[10px] uppercase tracking-wider">
                          Healthy
                        </Badge>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/analyses/${analysis.id}`} className="block">
                      {analysis.severity ? (
                        <Badge variant="outline" className={
                          analysis.severity === "og'ir" ? "bg-destructive/10 text-destructive border-destructive/20" :
                          analysis.severity === "o'rtacha" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        }>
                          {analysis.severity}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground font-mono">
                    <Link href={`/analyses/${analysis.id}`} className="block">
                      {format(new Date(analysis.createdAt), "MMM d, HH:mm")}
                    </Link>
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

import { useParams, Link } from "wouter";
import { useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User, Microscope, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function AnalysisDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: analysis, isLoading, isError } = useGetAnalysis(id, {
    query: { queryKey: getGetAnalysisQueryKey(id), enabled: !!id }
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Analysis Not Found</h2>
        <p className="text-muted-foreground mb-6">The field report you're looking for doesn't exist or has been removed.</p>
        <Button asChild variant="outline">
          <Link href="/analyses">Back to Analyses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center space-x-4">
        <Button asChild variant="outline" size="icon" className="shrink-0 border-border bg-card">
          <Link href="/analyses">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center space-x-3">
            <span>Field Report #{id}</span>
            {analysis && (
              analysis.diseaseDetected ? (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[10px] uppercase tracking-wider">
                  Infected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 font-mono text-[10px] uppercase tracking-wider">
                  Healthy
                </Badge>
              )
            )}
          </h2>
          {analysis && (
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <Calendar className="w-3 h-3 mr-1.5" />
              {format(new Date(analysis.createdAt), "MMMM d, yyyy 'at' HH:mm")}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Skeleton className="aspect-square rounded-md w-full" />
            <Skeleton className="h-40 rounded-md w-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-64 rounded-md w-full" />
          </div>
        </div>
      ) : analysis ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-1 space-y-6">
            <Card className="overflow-hidden border-border bg-card">
              {analysis.imageUrl ? (
                <div className="aspect-square w-full bg-secondary relative group">
                  <img 
                    src={analysis.imageUrl} 
                    alt={analysis.cropType || "Crop analysis image"} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <a href={analysis.imageUrl} target="_blank" rel="noopener noreferrer" className="text-white text-sm font-medium hover:underline">
                      View Full Size
                    </a>
                  </div>
                </div>
              ) : (
                <div className="aspect-square w-full bg-secondary flex items-center justify-center flex-col text-muted-foreground border-b border-border">
                  <Microscope className="w-12 h-12 mb-3 opacity-20" />
                  <span className="text-sm font-mono">NO IMAGE DATA</span>
                </div>
              )}
            </Card>

            <Card className="p-5 border-border bg-card space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
                  <Microscope className="w-3 h-3 mr-1.5" />
                  Crop Type
                </div>
                <div className="font-medium text-lg">
                  {analysis.cropType || "Not specified"}
                </div>
              </div>

              {analysis.diseaseDetected && analysis.severity && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                    Severity
                  </div>
                  <Badge variant="outline" className={
                    analysis.severity === "og'ir" ? "bg-destructive/10 text-destructive border-destructive/20 text-sm py-1 px-3" :
                    analysis.severity === "o'rtacha" ? "bg-orange-500/10 text-orange-500 border-orange-500/20 text-sm py-1 px-3" :
                    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-sm py-1 px-3"
                  }>
                    {analysis.severity.toUpperCase()}
                  </Badge>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center">
                  <User className="w-3 h-3 mr-1.5" />
                  Farmer Details
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{analysis.firstName || "Unknown"} {analysis.username ? `(@${analysis.username})` : ""}</div>
                  <div className="text-sm font-mono text-muted-foreground">ID: {analysis.telegramId}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="border-border bg-card flex flex-col h-full">
              <div className="p-5 border-b border-border bg-secondary/30">
                <h3 className="font-medium text-sm uppercase tracking-wider font-mono text-muted-foreground">Agronomist Bot Output</h3>
              </div>
              <div className="p-6 flex-1 overflow-auto bg-card/50">
                <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed text-base text-foreground/90 whitespace-pre-wrap">
                  {analysis.analysisText || "No analysis text provided."}
                </div>
              </div>
            </Card>
          </div>

        </div>
      ) : null}
    </div>
  );
}

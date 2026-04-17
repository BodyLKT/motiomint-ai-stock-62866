/**
 * Admin tool: scans every animation record and flags any whose
 * file_url or thumbnail_url returns a non-200 (or is missing/placeholder).
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Search, FileVideo, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface BrokenItem {
  id: string;
  title: string;
  category: string;
  field: 'file_url' | 'thumbnail_url';
  url: string;
  reason: string;
}

interface ScanResult {
  total: number;
  checked: number;
  ok: number;
  broken: BrokenItem[];
}

function isPlaceholder(url?: string | null): boolean {
  if (!url) return true;
  return url.includes('placehold.co') || url.includes('placeholder');
}

async function checkUrl(rawUrl: string): Promise<{ ok: boolean; reason: string }> {
  if (!rawUrl) return { ok: false, reason: 'empty URL' };
  if (isPlaceholder(rawUrl)) return { ok: false, reason: 'placeholder URL' };

  // Resolve relative paths against current origin
  const url = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

  try {
    // HEAD first (cheap), fallback to GET range
    let res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) {
      res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
    }
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, reason: 'ok' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'network error' };
  }
}

export default function MediaIntegrityChecker() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    setProgress(0);

    try {
      const { data, error } = await supabase
        .from('animations')
        .select('id, title, category, file_url, thumbnail_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data ?? [];
      const broken: BrokenItem[] = [];
      let checked = 0;

      // Limit concurrency to keep things reasonable
      const concurrency = 6;
      let cursor = 0;

      const worker = async () => {
        while (cursor < rows.length) {
          const idx = cursor++;
          const row = rows[idx];

          const [vid, thumb] = await Promise.all([
            checkUrl(row.file_url),
            checkUrl(row.thumbnail_url),
          ]);

          if (!vid.ok) {
            broken.push({
              id: row.id,
              title: row.title,
              category: row.category,
              field: 'file_url',
              url: row.file_url,
              reason: vid.reason,
            });
          }
          if (!thumb.ok) {
            broken.push({
              id: row.id,
              title: row.title,
              category: row.category,
              field: 'thumbnail_url',
              url: row.thumbnail_url,
              reason: thumb.reason,
            });
          }

          checked++;
          setProgress(Math.round((checked / rows.length) * 100));
        }
      };

      await Promise.all(Array.from({ length: concurrency }, worker));

      const finalResult: ScanResult = {
        total: rows.length,
        checked,
        ok: rows.length - new Set(broken.map((b) => b.id)).size,
        broken,
      };
      setResult(finalResult);

      if (broken.length === 0) {
        toast.success(`All ${rows.length} records have valid media URLs`);
      } else {
        toast.warning(`Found ${broken.length} broken URL(s) across ${new Set(broken.map((b) => b.id)).size} record(s)`);
      }
    } catch (e) {
      toast.error(`Scan failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Media Integrity Checker
        </CardTitle>
        <CardDescription>
          Scans every animation record and flags broken video or thumbnail URLs before they appear publicly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Verifies <code>file_url</code> and <code>thumbnail_url</code> with HEAD/GET requests.
          </p>
          <Button onClick={runScan} disabled={scanning} className="gap-2">
            <Search className={`h-4 w-4 ${scanning ? 'animate-pulse' : ''}`} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </Button>
        </div>

        {scanning && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {result && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Total: {result.total}</Badge>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                OK: {result.ok}
              </Badge>
              {result.broken.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Broken: {result.broken.length}
                </Badge>
              )}
            </div>

            {result.broken.length === 0 ? (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No broken media URLs detected.
              </p>
            ) : (
              <ScrollArea className="h-72">
                <div className="space-y-2">
                  {result.broken.map((b, i) => (
                    <div key={`${b.id}-${b.field}-${i}`} className="text-xs p-2 bg-destructive/10 rounded space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        {b.field === 'file_url' ? (
                          <FileVideo className="h-3 w-3" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        <span>{b.title}</span>
                        <Badge variant="outline" className="ml-auto">{b.category}</Badge>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-mono">{b.field}</span>: {b.reason}
                      </div>
                      <div className="text-muted-foreground break-all font-mono">
                        {b.url || '(empty)'}
                      </div>
                      <div className="text-muted-foreground">id: <span className="font-mono">{b.id}</span></div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

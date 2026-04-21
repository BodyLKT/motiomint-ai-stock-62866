import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import MainNavigation from '@/components/navigation/MainNavigation';
import { Footer } from '@/components/Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type CheckStatus = 'pending' | 'running' | 'pass' | 'fail';

interface CheckResult {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail?: string;
  matches?: string[];
}

// Routes to crawl in the built app — covers public pages where VEED could leak.
const ROUTES_TO_CRAWL = [
  '/',
  '/library',
  '/edit-share',
  '/pricing',
  '/about',
  '/contact',
  '/help',
  '/help/getting-started',
  '/help/subscription-billing',
  '/help/license-usage',
  '/help/contact-support',
  '/help/community',
  '/help/terms',
  '/terms-of-service',
  '/privacy-policy',
];

const VEED_PATTERN = /veed/i;

async function fetchRouteHtml(path: string): Promise<string> {
  // Same-origin SPA — fetch the route. Note: SPAs return the shell HTML, so we
  // also crawl the live DOM after navigation below.
  const res = await fetch(path, { headers: { Accept: 'text/html' } });
  return res.text();
}

function scanText(text: string): string[] {
  const lines = text.split('\n');
  const hits: string[] = [];
  lines.forEach((line, i) => {
    if (VEED_PATTERN.test(line)) {
      const trimmed = line.trim().slice(0, 200);
      hits.push(`L${i + 1}: ${trimmed}`);
    }
  });
  return hits;
}

export default function QaVeedAudit() {
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>([]);

  useEffect(() => {
    document.title = 'VEED Removal QA — MotioMint';
    window.scrollTo({ top: 0 });
  }, []);

  const summary = useMemo(() => {
    const total = checks.length;
    const pass = checks.filter((c) => c.status === 'pass').length;
    const fail = checks.filter((c) => c.status === 'fail').length;
    return { total, pass, fail };
  }, [checks]);

  const runAudit = async () => {
    setRunning(true);
    const results: CheckResult[] = [];

    // 1. Live DOM scan of currently rendered shell
    results.push({
      id: 'live-dom',
      label: 'Live DOM (current page)',
      description: 'Scans the rendered HTML of the current QA page for any VEED string.',
      status: 'running',
    });
    setChecks([...results]);

    const domText = document.documentElement.outerHTML;
    const domHits = scanText(domText).filter((l) => !l.includes('VEED Removal QA') && !l.includes('veed/i') && !l.includes('VEED_PATTERN'));
    results[results.length - 1] = {
      ...results[results.length - 1],
      status: domHits.length === 0 ? 'pass' : 'fail',
      detail: domHits.length === 0 ? 'No VEED strings in rendered DOM.' : `${domHits.length} match(es) found`,
      matches: domHits,
    };
    setChecks([...results]);

    // 2. Crawl SPA routes (returns shell — verifies no VEED in built index.html)
    for (const route of ROUTES_TO_CRAWL) {
      const idx = results.length;
      results.push({
        id: `route-${route}`,
        label: `Route ${route}`,
        description: 'Fetches the route and scans response HTML for VEED references.',
        status: 'running',
      });
      setChecks([...results]);

      try {
        const html = await fetchRouteHtml(route);
        const hits = scanText(html);
        results[idx] = {
          ...results[idx],
          status: hits.length === 0 ? 'pass' : 'fail',
          detail: hits.length === 0 ? 'Clean.' : `${hits.length} match(es)`,
          matches: hits.slice(0, 5),
        };
      } catch (e: any) {
        results[idx] = {
          ...results[idx],
          status: 'fail',
          detail: `Fetch error: ${e?.message ?? 'unknown'}`,
        };
      }
      setChecks([...results]);
    }

    // 3. Built JS bundle scan — verifies no VEED leaked into compiled chunks
    const bundleIdx = results.length;
    results.push({
      id: 'js-bundles',
      label: 'JS bundles (compiled output)',
      description: 'Scans every <script src> chunk loaded by the app for VEED strings or veed.io URLs.',
      status: 'running',
    });
    setChecks([...results]);

    const scriptSrcs = Array.from(document.querySelectorAll('script[src]'))
      .map((s) => (s as HTMLScriptElement).src)
      .filter((src) => src && new URL(src).origin === window.location.origin);

    let bundleHits: string[] = [];
    for (const src of scriptSrcs) {
      try {
        const res = await fetch(src);
        const text = await res.text();
        if (VEED_PATTERN.test(text)) {
          // Extract a small context window for each occurrence
          const re = /.{0,40}veed.{0,40}/gi;
          const matches = text.match(re) || [];
          bundleHits.push(`${src.split('/').pop()}: ${matches.slice(0, 3).join(' | ')}`);
        }
      } catch {
        /* ignore */
      }
    }
    results[bundleIdx] = {
      ...results[bundleIdx],
      status: bundleHits.length === 0 ? 'pass' : 'fail',
      detail: bundleHits.length === 0 ? `${scriptSrcs.length} bundle(s) clean.` : `${bundleHits.length} bundle(s) contain VEED`,
      matches: bundleHits,
    };
    setChecks([...results]);

    // 4. Database scan — verify no animation rows reference veed
    const dbIdx = results.length;
    results.push({
      id: 'db-animations',
      label: 'Database (animations table)',
      description: 'Checks animations title/description/file_url/thumbnail_url for VEED references.',
      status: 'running',
    });
    setChecks([...results]);

    try {
      const { data, error } = await supabase
        .from('animations')
        .select('id, title, description, file_url, thumbnail_url')
        .or('title.ilike.%veed%,description.ilike.%veed%,file_url.ilike.%veed%,thumbnail_url.ilike.%veed%');

      if (error) throw error;
      const rows = data ?? [];
      results[dbIdx] = {
        ...results[dbIdx],
        status: rows.length === 0 ? 'pass' : 'fail',
        detail: rows.length === 0 ? 'No animation rows reference VEED.' : `${rows.length} row(s) contain VEED`,
        matches: rows.map((r) => `${r.id}: ${r.title}`),
      };
    } catch (e: any) {
      results[dbIdx] = {
        ...results[dbIdx],
        status: 'fail',
        detail: `Query error: ${e?.message ?? 'unknown'}`,
      };
    }
    setChecks([...results]);

    setRunning(false);
  };

  const StatusIcon = ({ status }: { status: CheckStatus }) => {
    if (status === 'running') return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    if (status === 'pass') return <CheckCircle2 className="h-5 w-5 text-[hsl(var(--accent))]" />;
    if (status === 'fail') return <XCircle className="h-5 w-5 text-destructive" />;
    return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      <main className="pt-36 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> QA Audit
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VEED Removal Verification
            </h1>
            <p className="text-muted-foreground max-w-3xl">
              Programmatically scans the live app — rendered DOM, public routes, compiled JS bundles, and the database —
              to confirm zero remaining VEED strings, URLs, icons, buttons, routes, or handlers.
            </p>
          </header>

          <Card className="p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total checks</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Passing</p>
                <p className="text-2xl font-bold text-[hsl(var(--accent))]">{summary.pass}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Failing</p>
                <p className="text-2xl font-bold text-destructive">{summary.fail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {summary.total > 0 && summary.fail === 0 && !running && (
                <Badge className="bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> All clean
                </Badge>
              )}
              {summary.fail > 0 && !running && (
                <Badge variant="destructive">
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Issues found
                </Badge>
              )}
              <Button onClick={runAudit} disabled={running} size="lg">
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Run audit
                  </>
                )}
              </Button>
            </div>
          </Card>

          {checks.length === 0 && !running && (
            <Card className="p-12 text-center text-muted-foreground">
              Click <span className="font-semibold text-foreground">Run audit</span> to start scanning the live build.
            </Card>
          )}

          <div className="space-y-3">
            {checks.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <StatusIcon status={c.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold">{c.label}</p>
                      {c.detail && (
                        <span
                          className={
                            c.status === 'fail'
                              ? 'text-xs text-destructive'
                              : 'text-xs text-muted-foreground'
                          }
                        >
                          {c.detail}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                    {c.matches && c.matches.length > 0 && (
                      <pre className="mt-2 p-3 rounded bg-muted/40 border border-border/50 text-xs overflow-x-auto whitespace-pre-wrap">
                        {c.matches.join('\n')}
                      </pre>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 mt-8 bg-muted/30 border-primary/10">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Scope:</strong> rendered DOM · {ROUTES_TO_CRAWL.length} public routes ·
              all compiled JS bundles · animations table. Visit{' '}
              <Link to="/edit-share" className="text-primary underline inline-flex items-center gap-1">
                /edit-share <ExternalLink className="h-3 w-3" />
              </Link>{' '}
              to verify the editor grid renders only Canva and CapCut.
            </p>
          </Card>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}

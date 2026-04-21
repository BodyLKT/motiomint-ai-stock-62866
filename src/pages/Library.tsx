import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MainNavigation from '@/components/navigation/MainNavigation';
import EnhancedAnimationCard from '@/components/category/EnhancedAnimationCard';
import { Footer } from '@/components/Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignUpModal } from '@/components/auth/SignUpModal';
import { useAuth } from '@/contexts/AuthContext';
import { CANONICAL_CATEGORIES, getCategorySlug, type CanonicalCategory } from '@/lib/categoryMapping';

interface Animation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  canonical_category?: string | null;
  file_url: string;
  thumbnail_url: string;
  tags: string[] | null;
  created_at: string;
  format?: string | null;
  resolution?: string | null;
  thumb_card_url?: string | null;
  thumb_poster_url?: string | null;
  thumb_status?: string | null;
  thumb_source?: string | null;
}

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | CanonicalCategory>('All');
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    document.title = 'Animation Library — MotioMint';
    window.scrollTo({ top: 0 });
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('animations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) {
        toast({ title: 'Could not load library', description: error.message, variant: 'destructive' });
      } else {
        setAnimations((data || []) as Animation[]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return animations.filter((a) => {
      const cat = (a.canonical_category || a.category) as string;
      if (activeCategory !== 'All' && cat !== activeCategory) return false;
      if (!q) return true;
      const hay = `${a.title} ${a.description ?? ''} ${(a.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [animations, query, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation
        onLoginClick={() => setShowLogin(true)}
        onSignUpClick={() => setShowSignUp(true)}
      />

      <main className="pt-36 pb-16">
        <div className="container mx-auto px-4">
          <header className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Animation Library
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse the complete MotioMint catalog. Filter by category or search by title, tag, or description.
            </p>
          </header>

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search animations…"
              className="pl-10 h-11"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge
              variant={activeCategory === 'All' ? 'default' : 'outline'}
              className="cursor-pointer px-4 py-1.5 text-sm"
              onClick={() => setActiveCategory('All')}
            >
              All ({animations.length})
            </Badge>
            {CANONICAL_CATEGORIES.map((c) => {
              const count = animations.filter(
                (a) => (a.canonical_category || a.category) === c
              ).length;
              return (
                <Badge
                  key={c}
                  variant={activeCategory === c ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-1.5 text-sm"
                  onClick={() => setActiveCategory(c)}
                >
                  {c} ({count})
                </Badge>
              );
            })}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              No animations match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((a) => (
                <EnhancedAnimationCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  description={a.description ?? ''}
                  category={(a.canonical_category || a.category) as string}
                  thumbnailUrl={a.thumbnail_url}
                  videoUrl={a.file_url}
                  tags={a.tags || []}
                  format={a.format ?? undefined}
                  resolution={a.resolution ?? undefined}
                  isFavorite={false}
                  onFavoriteToggle={() => {
                    if (!user) setShowLogin(true);
                  }}
                  isGuest={!user}
                  onAuthRequired={() => setShowLogin(true)}
                  thumbCardUrl={a.thumb_card_url}
                  thumbStatus={a.thumb_status}
                  thumbSource={a.thumb_source}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <BackToTop />
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
      <SignUpModal open={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
    </div>
  );
}

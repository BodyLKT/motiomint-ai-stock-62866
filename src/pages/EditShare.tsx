import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Share2, Video, Smartphone, Facebook, Instagram, Linkedin, ExternalLink, CheckCircle2, Sparkles, X as XIcon } from 'lucide-react';
import MainNavigation from '@/components/navigation/MainNavigation';
import { Footer } from '@/components/Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignUpModal } from '@/components/auth/SignUpModal';
import { toast } from '@/hooks/use-toast';

const editors = [
  { name: 'Canva', url: 'https://www.canva.com/', desc: 'Drag-and-drop design editor with templates and brand kits.', icon: Edit3 },
  { name: 'VEED', url: 'https://www.veed.io/', desc: 'Browser-based video editor with subtitles, effects, and trimming.', icon: Video },
  { name: 'CapCut', url: 'https://www.capcut.com/', desc: 'Mobile-first creative editor for short-form social video.', icon: Smartphone },
];

const sharers = [
  { name: 'Facebook', icon: Facebook, build: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { name: 'X (Twitter)', icon: XIcon, build: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
  { name: 'LinkedIn', icon: Linkedin, build: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { name: 'Instagram', icon: Instagram, build: () => 'https://www.instagram.com/' },
];

export default function EditShare() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    document.title = 'Edit & Share — MotioMint';
    window.scrollTo({ top: 0 });
  }, []);

  const openExternal = (url: string, name: string) => {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) toast({ title: `Opening ${name}` });
    else toast({ title: `Unable to open ${name}`, description: 'Please allow pop-ups and try again.', variant: 'destructive' });
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation onLoginClick={() => setShowLogin(true)} onSignUpClick={() => setShowSignUp(true)} />

      <main className="pt-36 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <header className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Tools
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Edit &amp; Share
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Customize MotioMint animations in your favorite editor, then publish them straight to your social channels.
            </p>
          </header>

          {/* Edit section */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-2">
              <Edit3 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Edit in third-party editors</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Download an animation from your library, then open it in one of the supported editors below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editors.map((e) => (
                <Card key={e.name} className="p-6 flex flex-col items-center text-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <div className="p-3 rounded-full bg-primary/10">
                    <e.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{e.name}</h3>
                  <p className="text-xs text-muted-foreground">{e.desc}</p>
                  <Button variant="outline" className="mt-2 w-full" onClick={() => openExternal(e.url, e.name)}>
                    Open {e.name} <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-primary/10">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">
                  Canva, CapCut, and VEED are third-party tools. MotioMint is not affiliated with these services.
                  Editing your animation in these tools is subject to their own terms and privacy policies.
                </p>
              </div>
            </div>
          </section>

          <Separator className="my-10" />

          {/* Share section */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Share to social platforms</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Share an animation page directly to your audience. Open the animation, then use these quick share targets.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sharers.map((s) => (
                <Button
                  key={s.name}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => openExternal(s.build(window.location.origin), s.name)}
                >
                  <s.icon className="h-5 w-5" />
                  <span className="text-sm">{s.name}</span>
                </Button>
              ))}
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate('/library')}>Browse Animation Library</Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </div>
        </div>
      </main>

      <Footer />
      <BackToTop />
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
      <SignUpModal open={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
    </div>
  );
}

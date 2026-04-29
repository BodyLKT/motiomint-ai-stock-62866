import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadConfig {
  format: string;
  resolution: string;
  aspectRatio: string;
  platform?: string;
}

interface DownloadOptionsProps {
  onDownload: (config: DownloadConfig) => void;
  isDownloading: boolean;
}

type OutputFormatKey = 'portrait-hd' | 'portrait-4k';

const OUTPUT_FORMATS: Record<OutputFormatKey, {
  label: string;
  helper: string;
  resolution: string;
  aspectRatio: string;
}> = {
  'portrait-hd': {
    label: 'Portrait HD (1080×1920)',
    helper: '9:16 · Standard',
    resolution: '1080x1920',
    aspectRatio: '9:16',
  },
  'portrait-4k': {
    label: 'Portrait 4K (2160×3840)',
    helper: '9:16 · High quality',
    resolution: '2160x3840',
    aspectRatio: '9:16',
  },
};

const PLATFORMS: Array<{
  value: string;
  label: string;
  output: OutputFormatKey;
}> = [
  { value: 'instagram-story', label: 'Instagram Story', output: 'portrait-hd' },
  { value: 'instagram-reel', label: 'Instagram Reel', output: 'portrait-hd' },
  { value: 'tiktok', label: 'TikTok', output: 'portrait-hd' },
  { value: 'youtube-short', label: 'YouTube Short', output: 'portrait-hd' },
  { value: 'facebook-story', label: 'Facebook Story', output: 'portrait-hd' },
  { value: 'snapchat-spotlight', label: 'Snapchat Spotlight', output: 'portrait-hd' },
  { value: 'portrait-4k', label: 'Portrait 4K', output: 'portrait-4k' },
];

const FORMATS = [
  { value: 'mp4', label: 'MP4 (Recommended)', description: 'Universal compatibility' },
  { value: 'mov', label: 'MOV', description: 'Apple devices' },
  { value: 'webm', label: 'WebM', description: 'Web optimized' },
  { value: 'gif', label: 'GIF', description: 'Animated image' },
];

export default function DownloadOptions({ onDownload, isDownloading }: DownloadOptionsProps) {
  useTranslation();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [format, setFormat] = useState<string>('mp4');
  const [outputFormat, setOutputFormat] = useState<OutputFormatKey>('portrait-hd');

  const handlePlatformChange = (platformValue: string) => {
    const platform = PLATFORMS.find(p => p.value === platformValue);
    if (platform) {
      setSelectedPlatform(platformValue);
      setOutputFormat(platform.output);
    }
  };

  const handleOutputChange = (val: OutputFormatKey) => {
    setOutputFormat(val);
    // Clear preset if it doesn't match
    const preset = PLATFORMS.find(p => p.value === selectedPlatform);
    if (preset && preset.output !== val) {
      setSelectedPlatform('');
    }
  };

  const current = OUTPUT_FORMATS[outputFormat];
  const displayResolution = current.resolution.replace('x', '×');

  const handleDownload = () => {
    onDownload({
      format,
      resolution: current.resolution,
      aspectRatio: current.aspectRatio,
      platform: selectedPlatform || undefined,
    });
  };

  return (
    <Card className="p-6 space-y-6 bg-card/50 backdrop-blur-sm border-border/50">
      <div>
        <h3 className="text-lg font-semibold mb-2">Download Options</h3>
        <p className="text-sm text-muted-foreground">
          Portrait-only exports optimized for vertical platforms
        </p>
      </div>

      <Separator />

      {/* Platform Presets */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Platform Presets</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">All presets export in 9:16 portrait</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORMS.map((platform) => (
            <Button
              key={platform.value}
              variant={selectedPlatform === platform.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePlatformChange(platform.value)}
              className={cn(
                "justify-start text-left h-auto py-2",
                selectedPlatform === platform.value && "shadow-glow"
              )}
            >
              <div className="flex items-start gap-2 w-full">
                {selectedPlatform === platform.value && (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{platform.label}</div>
                  <div className="text-xs text-muted-foreground">9:16</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Format Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Format</label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((fmt) => (
              <SelectItem key={fmt.value} value={fmt.value}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{fmt.label}</span>
                  <span className="text-xs text-muted-foreground">{fmt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Output Format (merged Resolution + Aspect Ratio) */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Output Format</label>
        <Select
          value={outputFormat}
          onValueChange={(val) => handleOutputChange(val as OutputFormatKey)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(OUTPUT_FORMATS) as OutputFormatKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{OUTPUT_FORMATS[key].label}</span>
                  <span className="text-xs text-muted-foreground">{OUTPUT_FORMATS[key].helper}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Download Button */}
      <Button
        size="lg"
        className="w-full gap-2 shadow-glow"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            Download {format.toUpperCase()} ({displayResolution})
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Commercial license included • Instant download
      </p>
    </Card>
  );
}

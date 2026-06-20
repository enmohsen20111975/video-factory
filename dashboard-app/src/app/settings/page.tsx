"use client";

import * as React from "react";
import {
  Save,
  Loader2,
  Cpu,
  Mic,
  Film,
  Cloud,
  TestTube,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  pipelineApi,
  type PipelineConfigPayload,
} from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useAsyncAction } from "@/hooks/use-async-action";

const VLM_MODELS = [
  "qwen2-vl:7b",
  "qwen2-vl:32b",
  "llama3.2-vision:11b",
  "minicpm-v:8b",
  "llava:13b",
  "llava:7b",
];

const TTS_VOICES = [
  "ar-EG-SalmaNeural",
  "ar-EG-ShakirNeural",
  "ar-SA-HamedNeural",
  "ar-SA-ZariyahNeural",
  "ar-AE-FatimaNeural",
  "ar-AE-HamdanNeural",
];

const RESOLUTIONS = [
  { label: "1920×1080 (Full HD)", value: "1920x1080", w: 1920, h: 1080 },
  { label: "1280×720 (HD)", value: "1280x720", w: 1280, h: 720 },
  { label: "3840×2160 (4K)", value: "3840x2160", w: 3840, h: 2160 },
  { label: "1080×1920 (Portrait HD)", value: "1080x1920", w: 1080, h: 1920 },
];

const CRF_PRESETS = ["ultrafast", "fast", "medium", "slow", "slower"];

export default function SettingsPage() {
  const { data: config, loading } = useFetch<PipelineConfigPayload>(
    () => pipelineApi.getConfig(),
    [],
  );

  const [vlm, setVlm] = React.useState({
    preferred_model: "qwen2-vl:7b",
    cooldown_seconds: 10,
    vram_limit_mb: 7168,
    temperature: 0.3,
    max_tokens: 4096,
  });
  const [tts, setTts] = React.useState({
    voice: "ar-EG-SalmaNeural",
    rate: "+0%",
    pitch: "+0Hz",
    volume: 1,
  });
  const [video, setVideo] = React.useState({
    fps: 30,
    resolution_width: 1920,
    resolution_height: 1080,
    concurrency: 4,
    crf: 22,
    preset: "fast",
  });
  const [r2, setR2] = React.useState({
    enabled: false,
    account_id: "",
    access_key_id: "",
    secret_access_key: "",
    bucket_name: "",
    public_url_base: "",
  });

  // Sync from server
  React.useEffect(() => {
    if (config) {
      if (config.vlm) setVlm((v) => ({ ...v, ...config.vlm }));
      if (config.tts) setTts((v) => ({ ...v, ...config.tts }));
      if (config.video) setVideo((v) => ({ ...v, ...config.video }));
      if (config.r2) setR2((v) => ({ ...v, ...config.r2 }));
    }
  }, [config]);

  const { run: runSaveVlm } = useAsyncAction();
  const { run: runSaveTts } = useAsyncAction();
  const { run: runSaveVideo } = useAsyncAction();
  const { run: runSaveR2 } = useAsyncAction();
  const { run: runTestR2, loading: testingR2 } = useAsyncAction();

  const saveVlm = () =>
    runSaveVlm(() => pipelineApi.saveConfig({ vlm }), {
      successMessage: "تم حفظ إعدادات VLM",
    });

  const saveTts = () =>
    runSaveTts(() => pipelineApi.saveConfig({ tts }), {
      successMessage: "تم حفظ إعدادات الصوت",
    });

  const saveVideo = () =>
    runSaveVideo(() => pipelineApi.saveConfig({ video }), {
      successMessage: "تم حفظ إعدادات الفيديو",
    });

  const saveR2 = () =>
    runSaveR2(() => pipelineApi.saveConfig({ r2 }), {
      successMessage: "تم حفظ إعدادات R2",
    });

  const testR2 = () =>
    runTestR2(() => pipelineApi.testR2(), {
      successMessage: "اتصال R2 ناجح",
      errorMessage: "فشل اتصال R2",
    });

  if (loading) {
    return (
      <>
        <Header title="الإعدادات" />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="الإعدادات"
        description="تكوين نظام مصنع الفيديو"
      />
      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="vlm">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="vlm">
              <Cpu className="h-3.5 w-3.5" />
              نماذج VLM
            </TabsTrigger>
            <TabsTrigger value="tts">
              <Mic className="h-3.5 w-3.5" />
              الصوت (TTS)
            </TabsTrigger>
            <TabsTrigger value="video">
              <Film className="h-3.5 w-3.5" />
              الفيديو
            </TabsTrigger>
            <TabsTrigger value="r2">
              <Cloud className="h-3.5 w-3.5" />
              Cloudflare R2
            </TabsTrigger>
          </TabsList>

          {/* VLM Settings */}
          <TabsContent value="vlm">
            <Card className="p-5 max-w-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">إعدادات نماذج الرؤية اللغوية</h3>
              </div>

              <div className="grid gap-2">
                <Label>النموذج المفضل</Label>
                <Select
                  value={vlm.preferred_model}
                  onValueChange={(v) =>
                    setVlm({ ...vlm, preferred_model: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VLM_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        <span dir="ltr">{m}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Cooldown بين الصفحات (ثانية)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={vlm.cooldown_seconds}
                    onChange={(e) =>
                      setVlm({
                        ...vlm,
                        cooldown_seconds: Number(e.target.value),
                      })
                    }
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>GPU VRAM Limit (MB)</Label>
                  <Input
                    type="number"
                    min={1024}
                    step={512}
                    value={vlm.vram_limit_mb}
                    onChange={(e) =>
                      setVlm({
                        ...vlm,
                        vram_limit_mb: Number(e.target.value),
                      })
                    }
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>درجة الحرارة (Temperature)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={vlm.temperature}
                    onChange={(e) =>
                      setVlm({ ...vlm, temperature: Number(e.target.value) })
                    }
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>الحد الأقصى للـ Tokens</Label>
                  <Input
                    type="number"
                    min={512}
                    step={512}
                    value={vlm.max_tokens}
                    onChange={(e) =>
                      setVlm({ ...vlm, max_tokens: Number(e.target.value) })
                    }
                    dir="ltr"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={saveVlm}>
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* TTS Settings */}
          <TabsContent value="tts">
            <Card className="p-5 max-w-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">إعدادات توليد الصوت</h3>
              </div>

              <div className="grid gap-2">
                <Label>الصوت</Label>
                <Select
                  value={tts.voice}
                  onValueChange={(v) => setTts({ ...tts, voice: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_VOICES.map((v) => (
                      <SelectItem key={v} value={v}>
                        <span dir="ltr">{v}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>السرعة</Label>
                  <Select
                    value={tts.rate}
                    onValueChange={(v) => setTts({ ...tts, rate: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["-20%", "-10%", "+0%", "+10%", "+20%"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>النبرة</Label>
                  <Select
                    value={tts.pitch}
                    onValueChange={(v) => setTts({ ...tts, pitch: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["-10Hz", "-5Hz", "+0Hz", "+5Hz", "+10Hz"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>مستوى الصوت</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={tts.volume}
                    onChange={(e) =>
                      setTts({ ...tts, volume: Number(e.target.value) })
                    }
                    dir="ltr"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={saveTts}>
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Video Settings */}
          <TabsContent value="video">
            <Card className="p-5 max-w-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">إعدادات إنتاج الفيديو</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>FPS</Label>
                  <Select
                    value={String(video.fps)}
                    onValueChange={(v) =>
                      setVideo({ ...video, fps: Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[24, 30, 60].map((f) => (
                        <SelectItem key={f} value={String(f)}>
                          {f} fps
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>الدقة</Label>
                  <Select
                    value={`${video.resolution_width}x${video.resolution_height}`}
                    onValueChange={(v) => {
                      const r = RESOLUTIONS.find((r) => r.value === v);
                      if (r)
                        setVideo({
                          ...video,
                          resolution_width: r.w,
                          resolution_height: r.h,
                        });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>التزامن (Concurrency)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={32}
                    value={video.concurrency}
                    onChange={(e) =>
                      setVideo({ ...video, concurrency: Number(e.target.value) })
                    }
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>CRF (الجودة)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={51}
                    value={video.crf}
                    onChange={(e) =>
                      setVideo({ ...video, crf: Number(e.target.value) })
                    }
                    dir="ltr"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    أقل = جودة أعلى
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>الإعداد (Preset)</Label>
                  <Select
                    value={video.preset}
                    onValueChange={(v) => setVideo({ ...video, preset: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRF_PRESETS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={saveVideo}>
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* R2 Settings */}
          <TabsContent value="r2">
            <Card className="p-5 max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Cloudflare R2</h3>
                  <Badge variant={r2.enabled ? "success" : "secondary"}>
                    {r2.enabled ? "مُفعّل" : "معطّل"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">تفعيل</Label>
                  <Switch
                    checked={r2.enabled}
                    onCheckedChange={(v) => setR2({ ...r2, enabled: v })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Account ID</Label>
                <Input
                  value={r2.account_id}
                  onChange={(e) =>
                    setR2({ ...r2, account_id: e.target.value })
                  }
                  placeholder="abc123..."
                  dir="ltr"
                />
              </div>

              <div className="grid gap-2">
                <Label>Access Key ID</Label>
                <Input
                  value={r2.access_key_id}
                  onChange={(e) =>
                    setR2({ ...r2, access_key_id: e.target.value })
                  }
                  placeholder="..."
                  dir="ltr"
                  type="password"
                />
              </div>

              <div className="grid gap-2">
                <Label>Secret Access Key</Label>
                <Input
                  value={r2.secret_access_key}
                  onChange={(e) =>
                    setR2({ ...r2, secret_access_key: e.target.value })
                  }
                  placeholder="..."
                  dir="ltr"
                  type="password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Bucket Name</Label>
                  <Input
                    value={r2.bucket_name}
                    onChange={(e) =>
                      setR2({ ...r2, bucket_name: e.target.value })
                    }
                    placeholder="my-videos"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Public URL Base</Label>
                  <Input
                    value={r2.public_url_base}
                    onChange={(e) =>
                      setR2({ ...r2, public_url_base: e.target.value })
                    }
                    placeholder="https://cdn.example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={testR2} disabled={testingR2 || !r2.enabled}>
                  {testingR2 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  اختبار الاتصال
                </Button>
                <Button onClick={saveR2}>
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

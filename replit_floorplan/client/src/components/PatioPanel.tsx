import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type PatioWidth, type PatioSurface, PATIO_WIDTHS } from "@shared/schema";
import { Home } from "lucide-react";

interface PatioPanelProps {
  onStartDrawing: (widthType: PatioWidth, surfaceType: PatioSurface) => void;
  isDrawingMode: boolean;
}

export function PatioPanel({ onStartDrawing, isDrawingMode }: PatioPanelProps) {
  const [widthType, setWidthType] = useState<PatioWidth>('small');
  const [surfaceType, setSurfaceType] = useState<PatioSurface>('wooden');

  const handleStartDrawing = () => {
    onStartDrawing(widthType, surfaceType);
  };

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="add-patios-panel">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Add a patio or reception area to your floorplan. Choose the width and surface type, then draw a rectangle on the canvas.
        </p>

        <div className="space-y-6">
          {/* Width Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Patio Width</Label>
            <RadioGroup
              value={widthType}
              onValueChange={(value) => setWidthType(value as PatioWidth)}
              data-testid="patio-width-radio"
            >
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="small" id="small-width" data-testid="radio-small-width" />
                <Label htmlFor="small-width" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Small</span>
                    <span className="text-sm text-muted-foreground">{PATIO_WIDTHS.small} ft wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Compact patio area</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="medium" id="medium-width" data-testid="radio-medium-width" />
                <Label htmlFor="medium-width" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Medium</span>
                    <span className="text-sm text-muted-foreground">{PATIO_WIDTHS.medium} ft wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Standard patio size</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="large" id="large-width" data-testid="radio-large-width" />
                <Label htmlFor="large-width" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Large</span>
                    <span className="text-sm text-muted-foreground">{PATIO_WIDTHS.large} ft wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Spacious patio or reception area</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Surface Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Surface Type</Label>
            <RadioGroup
              value={surfaceType}
              onValueChange={(value) => setSurfaceType(value as PatioSurface)}
              data-testid="patio-surface-radio"
            >
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="wooden" id="wooden-surface" data-testid="radio-wooden" />
                <Label htmlFor="wooden-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-amber-700 flex items-center justify-center">
                      <div className="w-8 h-8 bg-amber-700 border border-amber-900"></div>
                    </div>
                    <div>
                      <div className="font-medium">Wooden Deck</div>
                      <p className="text-xs text-muted-foreground">Natural wood planks</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="marble" id="marble-surface" data-testid="radio-marble" />
                <Label htmlFor="marble-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-slate-100 flex items-center justify-center">
                      <div className="w-8 h-8 bg-slate-100 border border-slate-300"></div>
                    </div>
                    <div>
                      <div className="font-medium">Marble Tiles</div>
                      <p className="text-xs text-muted-foreground">Elegant marble finish</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="concrete" id="concrete-surface" data-testid="radio-concrete" />
                <Label htmlFor="concrete-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-stone-400 flex items-center justify-center">
                      <div className="w-8 h-8 bg-stone-400 border border-stone-500"></div>
                    </div>
                    <div>
                      <div className="font-medium">Concrete Slabs</div>
                      <p className="text-xs text-muted-foreground">Durable concrete surface</p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Draw Button */}
          <Button
            onClick={handleStartDrawing}
            className="w-full"
            size="lg"
            disabled={isDrawingMode}
            data-testid="start-patio-drawing"
          >
            <Home className="w-4 h-4 mr-2" />
            {isDrawingMode ? 'Drawing Mode Active' : 'Draw Patio'}
          </Button>

          {isDrawingMode && (
            <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Drawing Mode Active</p>
              <p className="text-xs text-muted-foreground">
                Click and drag to draw a rectangle. The width will be constrained to {PATIO_WIDTHS[widthType]} feet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


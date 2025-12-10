import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type DrivewayWidth, type DrivewaySurface, DRIVEWAY_WIDTHS } from "@shared/schema";
import { Car } from "lucide-react";

interface AddDrivewaysPanelProps {
  onStartDrawing: (widthType: DrivewayWidth, surfaceType: DrivewaySurface) => void;
  isDrawingMode: boolean;
}

export function AddDrivewaysPanel({ onStartDrawing, isDrawingMode }: AddDrivewaysPanelProps) {
  const [widthType, setWidthType] = useState<DrivewayWidth>('single');
  const [surfaceType, setSurfaceType] = useState<DrivewaySurface>('concrete');

  const handleStartDrawing = () => {
    onStartDrawing(widthType, surfaceType);
  };

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="add-driveways-panel">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Add a driveway to your floorplan. Choose the width and surface type, then draw a rectangle on the canvas.
        </p>

        <div className="space-y-6">
          {/* Width Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Driveway Width</Label>
            <RadioGroup 
              value={widthType} 
              onValueChange={(value) => setWidthType(value as DrivewayWidth)} 
              data-testid="driveway-width-radio"
            >
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="single" id="single-width" data-testid="radio-single-width" />
                <Label htmlFor="single-width" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Single Car</span>
                    <span className="text-sm text-muted-foreground">{DRIVEWAY_WIDTHS.single} ft wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Standard single vehicle driveway</p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="double" id="double-width" data-testid="radio-double-width" />
                <Label htmlFor="double-width" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Double Car</span>
                    <span className="text-sm text-muted-foreground">{DRIVEWAY_WIDTHS.double} ft wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Two vehicles side by side</p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="triple" id="triple-width" data-testid="radio-triple-width" />
                <Label htmlFor="triple-width" className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Triple Car</span>
                    <span className="text-sm text-muted-foreground">{DRIVEWAY_WIDTHS.triple} ft wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Three vehicles or extra wide</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Surface Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Surface Type</Label>
            <RadioGroup 
              value={surfaceType} 
              onValueChange={(value) => setSurfaceType(value as DrivewaySurface)} 
              data-testid="driveway-surface-radio"
            >
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="concrete" id="concrete-surface" data-testid="radio-concrete" />
                <Label htmlFor="concrete-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-zinc-300 flex items-center justify-center">
                      <div className="w-8 h-8 bg-zinc-300 border border-zinc-400"></div>
                    </div>
                    <div>
                      <span className="font-medium block">Concrete</span>
                      <p className="text-xs text-muted-foreground">Smooth gray surface with expansion joints</p>
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="pebbles" id="pebbles-surface" data-testid="radio-pebbles" />
                <Label htmlFor="pebbles-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-stone-200 flex items-center justify-center">
                      <div className="w-8 h-8 bg-stone-200 border border-stone-400" style={{
                        backgroundImage: 'radial-gradient(circle, #78716c 1px, transparent 1px)',
                        backgroundSize: '4px 4px'
                      }}></div>
                    </div>
                    <div>
                      <span className="font-medium block">Pebbles</span>
                      <p className="text-xs text-muted-foreground">Natural stone pebbles texture</p>
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="brick" id="brick-surface" data-testid="radio-brick" />
                <Label htmlFor="brick-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-red-600 flex items-center justify-center">
                      <div className="w-8 h-8 bg-red-600 border border-red-300" style={{
                        backgroundImage: 'linear-gradient(#fca5a5 1px, transparent 1px), linear-gradient(90deg, #fca5a5 1px, transparent 1px)',
                        backgroundSize: '8px 4px'
                      }}></div>
                    </div>
                    <div>
                      <span className="font-medium block">Brick</span>
                      <p className="text-xs text-muted-foreground">Classic brick paver pattern</p>
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="stone" id="stone-surface" data-testid="radio-stone" />
                <Label htmlFor="stone-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border-2 bg-stone-600 flex items-center justify-center">
                      <div className="w-8 h-8 bg-stone-600 border border-stone-800" style={{
                        backgroundImage: 'linear-gradient(#292524 1px, transparent 1px), linear-gradient(90deg, #292524 1px, transparent 1px)',
                        backgroundSize: '12px 12px'
                      }}></div>
                    </div>
                    <div>
                      <span className="font-medium block">Stone</span>
                      <p className="text-xs text-muted-foreground">Irregular stone blocks</p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleStartDrawing}
            className="w-full"
            variant={isDrawingMode ? "default" : "outline"}
            size="lg"
            data-testid="button-draw-driveway"
          >
            <Car className="w-4 h-4 mr-2" />
            {isDrawingMode ? "Drawing Driveway (drag on canvas)" : "Draw Driveway"}
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
        <p className="font-medium mb-1">How to Draw:</p>
        <ul className="space-y-0.5">
          <li>• Click "Draw Driveway" button above</li>
          <li>• Click and drag on the canvas to draw a rectangle</li>
          <li>• The width will be set to {DRIVEWAY_WIDTHS[widthType]} ft automatically</li>
          <li>• Release to complete the driveway</li>
          <li>• Use select tool to move, resize, or rotate</li>
        </ul>
      </div>
    </div>
  );
}


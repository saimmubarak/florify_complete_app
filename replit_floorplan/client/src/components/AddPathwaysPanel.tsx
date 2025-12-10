import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { type PathwaySurface } from "@shared/schema";
import { Footprints } from "lucide-react";

interface AddPathwaysPanelProps {
  onStartDrawing: (width: number, surfaceType: PathwaySurface) => void;
  isDrawingMode: boolean;
}

export function AddPathwaysPanel({ onStartDrawing, isDrawingMode }: AddPathwaysPanelProps) {
  const [width, setWidth] = useState<number>(3);
  const [surfaceType, setSurfaceType] = useState<PathwaySurface>('concrete');

  const handleStartDrawing = () => {
    if (width > 0 && width <= 20) {
      onStartDrawing(width, surfaceType);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="add-pathways-panel">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Add a pathway to your floorplan. Choose the width and surface type, then draw a freehand curved path on the canvas.
        </p>

        <div className="space-y-6">
          {/* Width Input */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Pathway Width (feet)</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="20"
                step="0.5"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 3)}
                className="w-32"
                data-testid="pathway-width-input"
              />
              <span className="text-sm text-muted-foreground">
                Typical: 3-4 ft for walking paths
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter a width between 1 and 20 feet
            </p>
          </div>

          {/* Surface Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Surface Type</Label>
            <RadioGroup 
              value={surfaceType} 
              onValueChange={(value) => setSurfaceType(value as PathwaySurface)} 
              data-testid="pathway-surface-radio"
            >
              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="concrete" id="concrete-surface" data-testid="radio-concrete-surface" />
                <Label htmlFor="concrete-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded border-2 border-gray-300 bg-gray-200 flex items-center justify-center">
                      <div className="w-10 h-10 bg-zinc-300 rounded"></div>
                    </div>
                    <div>
                      <span className="font-medium block">Concrete</span>
                      <p className="text-xs text-muted-foreground">Smooth gray surface with expansion joints</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="pebbles" id="pebbles-surface" data-testid="radio-pebbles-surface" />
                <Label htmlFor="pebbles-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded border-2 border-gray-300 bg-stone-200 flex items-center justify-center">
                      <div className="w-10 h-10 bg-stone-300 rounded flex flex-wrap gap-0.5 p-1">
                        <div className="w-1 h-1 bg-stone-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-stone-500 rounded-full"></div>
                        <div className="w-1 h-1 bg-amber-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-stone-400 rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium block">Pebbles</span>
                      <p className="text-xs text-muted-foreground">Natural stone pebbles on beige base</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="brick" id="brick-surface" data-testid="radio-brick-surface" />
                <Label htmlFor="brick-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded border-2 border-gray-300 bg-red-600 flex items-center justify-center">
                      <div className="w-10 h-10 bg-red-600 rounded grid grid-cols-2 gap-0.5 p-1">
                        <div className="bg-red-700 rounded-sm"></div>
                        <div className="bg-red-600 rounded-sm"></div>
                        <div className="bg-red-600 rounded-sm"></div>
                        <div className="bg-red-700 rounded-sm"></div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium block">Brick</span>
                      <p className="text-xs text-muted-foreground">Red brick paver pattern</p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="stone" id="stone-surface" data-testid="radio-stone-surface" />
                <Label htmlFor="stone-surface" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded border-2 border-gray-300 bg-stone-700 flex items-center justify-center">
                      <div className="w-10 h-10 bg-stone-700 rounded"></div>
                    </div>
                    <div>
                      <span className="font-medium block">Stone</span>
                      <p className="text-xs text-muted-foreground">Dark gray stone blocks</p>
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
            variant={isDrawingMode ? "secondary" : "default"}
            disabled={width <= 0 || width > 20}
            data-testid="start-pathway-drawing-button"
          >
            <Footprints className="mr-2 h-4 w-4" />
            {isDrawingMode ? "Drawing Pathway..." : "Draw Pathway"}
          </Button>

          {isDrawingMode && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Drawing Mode Active:</strong> Click and hold the left mouse button, then drag to draw a curved pathway. Release to finish.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


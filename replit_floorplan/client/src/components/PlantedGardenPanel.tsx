import { Button } from "@/components/ui/button";
import { Sprout, Info } from "lucide-react";

interface PlantedGardenPanelProps {
  plantCount: number;
  onGoBack: () => void;
}

export function PlantedGardenPanel({ plantCount, onGoBack }: PlantedGardenPanelProps) {
  return (
    <div className="flex flex-col gap-6 p-4" data-testid="planted-garden-panel">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sprout className="w-5 h-5 text-green-600" />
          <h3 className="text-base font-semibold">Planted Garden</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Your floorplan now includes AI-generated plant placements based on your garden design.
        </p>

        <div className="space-y-4">
          {/* Plant count info */}
          <div className="p-4 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Sprout className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-lg text-green-900">{plantCount} Plants</div>
                <p className="text-sm text-green-700">Detected and positioned</p>
              </div>
            </div>
          </div>

          {/* Information box */}
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">Plant Symbols</p>
                <ul className="space-y-0.5 text-blue-800">
                  <li>• Plant positions are generated from your garden design</li>
                  <li>• Symbols are scaled to match the floorplan</li>
                  <li>• You can view and export this planted garden layout</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Plant categories info */}
          {plantCount > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Plant Categories:</p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Trees</span>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">Shrubs</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Perennials</span>
              </div>
            </div>
          )}

          {/* Back to Export button */}
          <Button
            onClick={onGoBack}
            className="w-full mt-4"
            size="lg"
            data-testid="back-to-export"
          >
            Back to Export
          </Button>

          {plantCount === 0 && (
            <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-900">
                <span className="font-medium">No plants detected.</span> You can still proceed to export your floorplan without plant symbols.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

/**
 * FloorplanRenderer Component
 * Renders the floorplan structure (walls, doors, driveways, pathways, patios) from blueprint data
 * with proper scaling: 1ft = 10.03px
 * Positioned at top-left: (0px, 20px)
 */
const FloorplanRenderer = ({ blueprint }) => {
  if (!blueprint) {
    console.log('FloorplanRenderer: No blueprint provided');
    return null;
  }

  console.log('FloorplanRenderer: Blueprint data:', blueprint);

  // The blueprint data might be in different locations:
  // 1. blueprint.blueprintData (from database)
  // 2. blueprint.floorplan (direct pass)
  // 3. blueprint itself (if already unwrapped)
  let floorplan = null;

  if (blueprint.blueprintData) {
    // Parse blueprintData if it's a string
    floorplan = typeof blueprint.blueprintData === 'string'
      ? JSON.parse(blueprint.blueprintData)
      : blueprint.blueprintData;
    console.log('FloorplanRenderer: Using blueprint.blueprintData');
  } else if (blueprint.floorplan) {
    floorplan = blueprint.floorplan;
    console.log('FloorplanRenderer: Using blueprint.floorplan');
  } else {
    floorplan = blueprint;
    console.log('FloorplanRenderer: Using blueprint directly');
  }

  console.log('FloorplanRenderer: Floorplan structure:', {
    hasShapes: !!floorplan.shapes,
    hasDoors: !!floorplan.doors,
    hasDriveways: !!floorplan.driveways,
    hasPathways: !!floorplan.pathways,
    hasPatios: !!floorplan.patios,
    floorplanKeys: Object.keys(floorplan),
    fullFloorplan: floorplan
  });

  if (!floorplan.shapes && !floorplan.doors && !floorplan.driveways && !floorplan.pathways && !floorplan.patios) {
    console.log('FloorplanRenderer: No floorplan structure data found');
    console.log('FloorplanRenderer: Floorplan object:', JSON.stringify(floorplan, null, 2));

    // Still render debug elements to show we're here
    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          border: '2px solid orange' // Orange border to indicate missing data
        }}
      >
        <rect x="0" y="0" width="100" height="100" fill="orange" opacity="0.3" />
        <text x="10" y="130" fill="red" fontSize="12">
          No floorplan structure data found!
        </text>
      </svg>
    );
  }

  // Replit floorplan uses: 170.5px × 300.89px for 51ft × 90ft house
  // Original scale: ~3.344px/ft
  // New scale: 10.03px/ft
  // Conversion factor: 10.03 / 3.344 = ~3.0
  const SCALE = 3.0; // Scale from replit coordinates to display coordinates
  const OFFSET_X = 0;
  const OFFSET_Y = 20;

  // Pipeline colors for AI model compatibility (matching replit_floorplan export)
  const PIPELINE_COLORS = {
    house: '#e48d91',      // Pink for house/building
    driveway: '#b9b9ba',   // Gray for driveway
    pathway: '#b9b9ba',    // Gray for pathway
    boundaryWall: '#d3a8d2', // Purple/lavender for boundary wall (plot)
    patio: '#f8b18e',      // Orange/peach for patio
    wall: '#d3a8d2',       // Purple for interior walls
    door: '#ffffff',       // White for doors
  };

  console.log('FloorplanRenderer: Rendering floorplan with:', {
    shapes: floorplan.shapes?.length || 0,
    doors: floorplan.doors?.length || 0,
    driveways: floorplan.driveways?.length || 0,
    pathways: floorplan.pathways?.length || 0,
    patios: floorplan.patios?.length || 0
  });

  // DEBUG: Log first shape to understand structure
  if (floorplan.shapes && floorplan.shapes.length > 0) {
    console.log('FloorplanRenderer: First shape:', floorplan.shapes[0]);
    console.log('FloorplanRenderer: First shape vertices:', floorplan.shapes[0].vertices);
  }

  // Render a shape (wall/fence/etc)
  const renderShape = (shape) => {
    if (!shape.vertices || shape.vertices.length < 2) return null;

    // Scale and offset vertices
    const scaledVertices = shape.vertices.map(v => ({
      x: v.x * SCALE + OFFSET_X,
      y: v.y * SCALE + OFFSET_Y
    }));

    // Create path string
    const pathData = scaledVertices
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`)
      .join(' ') + (shape.type === 'polygon' ? ' Z' : '');

    // Determine color based on layer type (pipeline colors for "skins")
    let strokeColor = PIPELINE_COLORS.boundaryWall; // Default
    if (shape.layer === 'house') {
      strokeColor = PIPELINE_COLORS.house;
    } else if (shape.layer === 'plot') {
      strokeColor = PIPELINE_COLORS.boundaryWall;
    } else if (shape.layer === 'wall') {
      strokeColor = PIPELINE_COLORS.wall;
    }

    // Calculate stroke width: strokeMm * SCALE * 6, minimum 3px (like export-canvas.ts)
    const strokeWidth = Math.max((shape.strokeMm || 0.25) * SCALE * 6, 3);

    return (
      <path
        key={shape.id}
        d={pathData}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={shape.fill || 'none'}
        opacity={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  // Render a door
  const renderDoor = (door) => {
    const x = door.position.x * SCALE + OFFSET_X;
    const y = door.position.y * SCALE + OFFSET_Y;
    // Door width in feet * pixels per foot (SCALE converts from replit coords)
    const doorWidth = door.width * SCALE;
    // Line weight for doors: minimum 5px for visibility (like export-canvas.ts)
    const strokeWidth = Math.max(5 * SCALE, 5);

    return (
      <g key={door.id}>
        <line
          x1={x - doorWidth / 2}
          y1={y}
          x2={x + doorWidth / 2}
          y2={y}
          stroke={PIPELINE_COLORS.door}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.8}
          transform={`rotate(${door.rotation}, ${x}, ${y})`}
        />
      </g>
    );
  };

  // Render a driveway
  const renderDriveway = (driveway) => {
    if (!driveway.vertices || driveway.vertices.length !== 4) return null;

    const scaledVertices = driveway.vertices.map(v => ({
      x: v.x * SCALE + OFFSET_X,
      y: v.y * SCALE + OFFSET_Y
    }));

    const pathData = scaledVertices
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`)
      .join(' ') + ' Z';

    // Line weight for driveways: minimum 4px (like export-canvas.ts)
    const strokeWidth = Math.max(4 * SCALE, 4);

    return (
      <path
        key={driveway.id}
        d={pathData}
        stroke={PIPELINE_COLORS.driveway}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  // Render a pathway
  const renderPathway = (pathway) => {
    if (!pathway.vertices || pathway.vertices.length < 2) return null;

    const scaledVertices = pathway.vertices.map(v => ({
      x: v.x * SCALE + OFFSET_X,
      y: v.y * SCALE + OFFSET_Y
    }));

    const pathData = scaledVertices
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`)
      .join(' ');

    // Line weight for pathways: pathway.width * SCALE * 1.5, minimum 4px (like export-canvas.ts)
    // Note: pathway.width is in feet, SCALE converts to pixels
    const strokeWidth = Math.max(pathway.width * SCALE * 1.5, 4);

    return (
      <path
        key={pathway.id}
        d={pathData}
        stroke={PIPELINE_COLORS.pathway}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  // Render a patio
  const renderPatio = (patio) => {
    if (!patio.vertices || patio.vertices.length !== 4) return null;

    const scaledVertices = patio.vertices.map(v => ({
      x: v.x * SCALE + OFFSET_X,
      y: v.y * SCALE + OFFSET_Y
    }));

    const pathData = scaledVertices
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`)
      .join(' ') + ' Z';

    // Line weight for patios: minimum 4px (like export-canvas.ts)
    const strokeWidth = Math.max(4 * SCALE, 4);

    return (
      <path
        key={patio.id}
        d={pathData}
        stroke={PIPELINE_COLORS.patio}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    >
      {/* Render driveways first (background layer) */}
      {floorplan.driveways && floorplan.driveways.map(renderDriveway)}

      {/* Render pathways */}
      {floorplan.pathways && floorplan.pathways.map(renderPathway)}

      {/* Render patios */}
      {floorplan.patios && floorplan.patios.map(renderPatio)}

      {/* Render shapes (walls, fences, etc.) */}
      {floorplan.shapes && floorplan.shapes.map(renderShape)}

      {/* Render doors */}
      {floorplan.doors && floorplan.doors.map(renderDoor)}
    </svg>
  );
};

export default FloorplanRenderer;

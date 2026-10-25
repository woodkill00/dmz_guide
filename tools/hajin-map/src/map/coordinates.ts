export interface MapPosition {
  mapId: string;
  coordinateSpaceVersion: string;
  x: number;
  y: number;
}

export interface ImageSpace {
  id: string;
  coordinateSpaceVersion: string;
  width: number;
  height: number;
}

export function toPixels(position: MapPosition, space: ImageSpace): [number, number] {
  if (position.mapId !== space.id || position.coordinateSpaceVersion !== space.coordinateSpaceVersion) {
    throw new Error('Position belongs to a different map or coordinate version.');
  }
  if (![position.x, position.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error('Position must contain finite coordinates between zero and one.');
  }
  return [position.x * space.width, position.y * space.height];
}

export function fromPixels(x: number, y: number, space: ImageSpace): MapPosition {
  const position = { mapId: space.id, coordinateSpaceVersion: space.coordinateSpaceVersion, x: x / space.width, y: y / space.height };
  toPixels(position, space);
  return position;
}

declare module '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions' {
    export default class MapboxDirections {
        constructor(options?: any);
        onAdd(map: any): HTMLElement;
        onRemove(map: any): void;
        setOrigin(origin: any): void;
        setDestination(dest: any): void;
    }
}

declare module "leaflet-arrowheads" {
  import L from "leaflet";
  
  interface ArrowheadOptions {
    size?: string;
    frequency?: string | number;
    fill?: boolean;
    color?: string;
    yawn?: number;
  }

  module "leaflet" {
    interface Polyline {
      arrowheads(options?: ArrowheadOptions): this;
      deleteArrowheads(): this;
    }
  }
}
